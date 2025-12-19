/**
 * Manifest 服务层
 *
 * 处理客户端检查更新的核心逻辑：
 * - 渠道验证
 * - 指令检查
 * - 最新更新获取
 * - 灰度规则匹配
 * - Manifest 构建
 * - 代码签名
 * - Manifest Filters 生成
 */

import { signManifestAsync } from '@/common/crypto';
import type { RapidSDatabase as Database } from '@/common/database/postgresql/rapid-s';
import { generateManifestFilters } from '@/common/utils/sfv';
import { eq } from 'drizzle-orm';
import * as channelService from '../../manage/channels/service';
import * as directiveService from '../../manage/directives/service';
import * as rolloutService from '../../manage/rollout-rules/service';
import * as updateService from '../../manage/updates/service';
import { assets } from '../../storage/assets/schema';
import { updateAssets } from '../../storage/update-assets/schema';
import {
  RESPONSE_TYPE,
  type CheckUpdateRequest,
  type CheckUpdateResponse,
  type Manifest,
  type ManifestAsset,
  type Platform,
} from './types';

// ========== 工具函数 ==========

/**
 * 计算确定性哈希用于灰度百分比
 *
 * 确保同一设备对同一更新始终返回相同结果
 */
function calculateDeterministicSeed(
  deviceId: string,
  updateId: string
): number {
  const combined = `${deviceId}:${updateId}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash) % 100;
}

// ========== 核心服务函数 ==========

/**
 * 检查更新
 *
 * 主入口函数，处理完整的检查更新流程
 */
export async function checkUpdate(
  db: Database,
  request: CheckUpdateRequest,
  /** 资源 URL 前缀（用于构建资源下载地址） */
  assetUrlPrefix: string
): Promise<CheckUpdateResponse> {
  // 1. 验证渠道
  const channel = await channelService.getChannelByKey(
    db,
    request.channelKey
  );

  if (!channel) {
    throw new Error('渠道不存在或已失效');
  }

  // 2. 检查是否有活跃指令（如回滚指令）
  const activeDirective = await directiveService.getActiveDirective(
    db,
    channel.id,
    request.runtimeVersion
  );

  if (activeDirective) {
    return {
      type: RESPONSE_TYPE.ROLLBACK,
      directive: {
        type: activeDirective.type as 'rollBackToEmbedded',
        parameters: activeDirective.parameters ?? undefined,
        extra: activeDirective.extra ?? undefined,
      },
    };
  }

  // 3. 获取最新启用更新
  const latestUpdate = await updateService.getLatestEnabledUpdate(
    db,
    channel.id,
    request.runtimeVersion
  );

  // 无可用更新
  if (!latestUpdate) {
    return { type: RESPONSE_TYPE.NO_UPDATE };
  }

  // 4. 检查是否已是最新版本
  if (request.currentUpdateId === latestUpdate.id) {
    return { type: RESPONSE_TYPE.NO_UPDATE };
  }

  // 5. 检查灰度规则
  const rules = await rolloutService.listEnabledRulesByUpdate(
    db,
    latestUpdate.id
  );

  // 计算灰度匹配
  const shouldReceive = rolloutService.matchRules(
    rules.map(r => ({ type: r.type, value: r.value })),
    {
      deviceId: request.deviceId,
      headers: request.customHeaders,
      randomSeed: request.deviceId
        ? calculateDeterministicSeed(
            request.deviceId,
            latestUpdate.id
          )
        : undefined,
    }
  );

  // 检查基础百分比（如果没有通过规则匹配）
  if (!shouldReceive) {
    const basePercentage = latestUpdate.rolloutPercentage;
    if (basePercentage < 100) {
      const seed = request.deviceId
        ? calculateDeterministicSeed(
            request.deviceId,
            latestUpdate.id
          )
        : Math.random() * 100;
      if (seed >= basePercentage) {
        return { type: RESPONSE_TYPE.NO_UPDATE };
      }
    }
  }

  // 6. 构建 Manifest
  const manifest = await buildManifest(
    db,
    latestUpdate,
    request.platform,
    assetUrlPrefix
  );

  // 7. 生成 Manifest Filters（基于渠道配置和更新元数据）
  const manifestFilters = generateManifestFilters(
    manifest.metadata,
    (channel.manifestFilterKeys as string[]) ?? []
  );

  // 8. 生成签名（如果渠道启用了签名）
  let signature: string | undefined;
  if (channel.signingEnabled && channel.privateKey) {
    // 使用 Bun Web Crypto API 进行 RSA-SHA256 签名，返回 SFV 格式: sig=:base64:
    const manifestJson = JSON.stringify(manifest);
    signature = await signManifestAsync(
      manifestJson,
      channel.privateKey
    );
  }

  return {
    type: RESPONSE_TYPE.UPDATE_AVAILABLE,
    manifest,
    manifestFilters,
    signature,
  };
}

/**
 * 构建 Manifest
 *
 * 从更新记录和关联资源构建完整的 Manifest
 */
async function buildManifest(
  db: Database,
  update: NonNullable<
    Awaited<ReturnType<typeof updateService.getUpdateById>>
  >,
  platform: Platform,
  assetUrlPrefix: string
): Promise<Manifest> {
  // 获取更新关联的资源
  const updateAssetRecords = await db
    .select({
      asset: assets,
      isLaunchAsset: updateAssets.isLaunchAsset,
      platform: updateAssets.platform,
    })
    .from(updateAssets)
    .innerJoin(assets, eq(updateAssets.assetId, assets.id))
    .where(eq(updateAssets.updateId, update.id));

  // 过滤平台相关资源
  const platformAssets = updateAssetRecords.filter(
    record => record.platform === platform || record.platform === null
  );

  // 分离启动资源和其他资源
  let launchAsset: ManifestAsset | null = null;
  const assetList: ManifestAsset[] = [];

  for (const record of platformAssets) {
    const manifestAsset: ManifestAsset = {
      hash: record.asset.hash,
      key: record.asset.key,
      contentType: record.asset.contentType,
      fileExtension: record.asset.fileExtension,
      url: `${assetUrlPrefix}/${record.asset.hash}`,
    };

    if (record.isLaunchAsset) {
      // 优先使用平台特定的启动资源
      if (
        !launchAsset ||
        (record.platform === platform && launchAsset)
      ) {
        launchAsset = manifestAsset;
      }
    } else {
      assetList.push(manifestAsset);
    }
  }

  if (!launchAsset) {
    throw new Error('更新缺少启动资源（Launch Asset）');
  }

  return {
    id: update.id,
    createdAt: update.createdAt.toISOString(),
    runtimeVersion: update.runtimeVersion,
    launchAsset,
    assets: assetList,
    metadata: (update.metadata as Record<string, string>) ?? {},
    extra: (update.extra as Record<string, unknown>) ?? {},
  };
}

// ========== 类型导出 ==========

export type CheckUpdateResult = Awaited<
  ReturnType<typeof checkUpdate>
>;
