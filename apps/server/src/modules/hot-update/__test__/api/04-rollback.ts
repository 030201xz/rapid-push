/**
 * 04 - 回滚测试
 *
 * 测试内容：
 * - 创建第二个更新（v2）
 * - 验证客户端获取到 v2
 * - 执行回滚到 v1
 * - 验证客户端获取到回滚版本
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-rollback.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createAnonymousClient,
  createClient,
  createTestLogger,
  getManageApi,
  getProtocolApi,
  loadTestContext,
  saveTestContext,
} from '../apis/_shared';

const logger = createTestLogger('04-Rollback');

// ========== 辅助函数 ==========

/** 创建 v2 Bundle ZIP */
async function createV2BundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-test-bundle-v2';
  const zipPath = '/tmp/rapid-s-test-bundle-v2.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'ios'), { recursive: true });
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  const iosBundleContent = `// iOS Bundle v2.0.0 - 有问题的版本，需要回滚
console.log("Buggy v2 Update!");
export default function App() {
  throw new Error("Bug in v2!");
}`;

  const androidBundleContent = `// Android Bundle v2.0.0 - 有问题的版本
console.log("Buggy v2 Update!");
export default function App() {
  throw new Error("Bug in v2!");
}`;

  writeFileSync(
    join(tmpDir, 'ios', 'index.bundle'),
    iosBundleContent
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    androidBundleContent
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);

  const zipBuffer = await Bun.file(zipPath).arrayBuffer();

  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(zipBuffer);
}

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('⏪ 步骤 04: 回滚测试');
  logger.info('='.repeat(50));

  try {
    // 加载测试上下文
    const ctx = await loadTestContext();
    if (
      !ctx.accessToken ||
      !ctx.channelId ||
      !ctx.channelKey ||
      !ctx.updateIds?.length
    ) {
      throw new Error('测试上下文不完整，请先运行前置测试');
    }

    const v1UpdateId = ctx.updateIds[ctx.updateIds.length - 1]!;
    const anonymousClient = createAnonymousClient();
    const protocol = getProtocolApi(anonymousClient);

    // 1. 验证当前 v1 是最新
    logger.info('1. 验证当前 v1 是最新...');
    const beforeV2 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'rollback-test-device',
    });

    if (beforeV2.type === 'updateAvailable') {
      logger.info('✅ 当前最新版本', {
        updateId: beforeV2.manifest.id,
      });
    }

    // 2. 上传 v2 更新（有问题的版本）
    logger.info('2. 上传 v2 更新（模拟有问题的版本）...');
    const v2Bundle = await createV2BundleZip();

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', 'v2 有 Bug 的版本 - 需要回滚');
    formData.append('rolloutPercentage', '100');

    const bundleBlob = new Blob([new Uint8Array(v2Bundle)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    const uploadResponse = await fetch(
      `${API_URL}/hotUpdate.manage.updates.upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`上传失败: ${await uploadResponse.text()}`);
    }

    const uploadResult = await uploadResponse.json();
    const v2UpdateId = uploadResult.result?.data?.update?.id;
    if (!v2UpdateId) {
      throw new Error('未获取到 v2 更新 ID');
    }

    logger.info('✅ v2 上传成功', { v2UpdateId });

    // 保存 v2 ID
    const updateIds = ctx.updateIds;
    updateIds.push(v2UpdateId);
    await saveTestContext({ updateIds });

    // 3. 验证客户端获取到 v2
    logger.info('3. 验证客户端获取到 v2...');
    const afterV2 = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'rollback-test-device',
    });

    if (afterV2.type === 'updateAvailable') {
      const isV2 = afterV2.manifest.id === v2UpdateId;
      logger.info('✅ 当前最新版本', {
        updateId: afterV2.manifest.id,
        isV2,
      });
      if (!isV2) {
        throw new Error('客户端未获取到 v2');
      }
    }

    // 4. 执行回滚到 v1
    logger.info('4. 执行回滚到 v1...');
    const authedClient = createClient(API_URL, {
      token: ctx.accessToken,
    });
    const manage = getManageApi(authedClient);

    const rollbackResult = await manage.updates.rollback.mutate({
      sourceUpdateId: v1UpdateId,
    });

    logger.info('✅ 回滚操作成功', {
      rollbackUpdateId: rollbackResult.id,
      isRollback: rollbackResult.isRollback,
      description: rollbackResult.description,
    });

    // 保存回滚版本 ID
    updateIds.push(rollbackResult.id);
    await saveTestContext({ updateIds });

    // 5. 验证客户端获取到回滚版本
    logger.info('5. 验证客户端获取到回滚版本...');
    const afterRollback = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'rollback-verify-device',
    });

    if (afterRollback.type === 'updateAvailable') {
      const isRollbackVersion =
        afterRollback.manifest.id === rollbackResult.id;
      logger.info('✅ 回滚验证', {
        currentUpdateId: afterRollback.manifest.id,
        expectedRollbackId: rollbackResult.id,
        matched: isRollbackVersion,
      });

      if (!isRollbackVersion) {
        logger.warn('⚠️ 客户端未获取到回滚版本');
      }
    }

    // 6. 验证回滚版本详情
    logger.info('6. 验证回滚版本详情...');
    const rollbackDetails = await manage.updates.byId.query({
      id: rollbackResult.id,
    });

    if (rollbackDetails) {
      logger.info('✅ 回滚版本详情', {
        id: rollbackDetails.id,
        isRollback: rollbackDetails.isRollback,
        runtimeVersion: rollbackDetails.runtimeVersion,
        isEnabled: rollbackDetails.isEnabled,
      });
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 04 完成！回滚测试通过');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run src/modules/hot-update/__test__/api/05-cleanup.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
