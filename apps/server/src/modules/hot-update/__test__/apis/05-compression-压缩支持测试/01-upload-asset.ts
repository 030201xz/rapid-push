/**
 * 压缩支持测试 - 步骤 01: 上传资源
 *
 * 测试内容：
 * - 创建测试 Bundle ZIP
 * - 上传到服务器
 * - 保存资源哈希供后续测试使用
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/01-upload-asset.ts
 */

import { env } from '@/common/env';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createTestLogger,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Compression:01-Upload');

/** API 基础地址 */
const BASE_URL = `http://${env.host}:${env.port}`;

/**
 * 创建测试 Bundle ZIP
 * 包含一个 JavaScript bundle 文件用于测试压缩效果
 */
async function createTestBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-compression-test';
  const zipPath = '/tmp/rapid-s-compression-test.zip';

  // 清理旧文件
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略清理错误
  }

  // 创建目录结构
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  // 创建一个较大的 JS Bundle 文件以便测试压缩效果
  // JavaScript 文件具有很高的压缩率
  const bundleContent = `
/**
 * Compression Test Bundle
 * 
 * This is a test bundle for validating gzip compression support
 * in the Rapid-S hot update server.
 */

// 重复内容以增加文件大小，便于观察压缩效果
const REPEATED_DATA = [
  ${
    '  "compression_test_data_' +
    Array.from({ length: 50 }, (_, i) => `item_${i}`)
      .map(s => `${s}": "value_for_${s}"`)
      .join(',\n  ')
  }
];

const CONFIG = {
  version: "1.0.0",
  buildNumber: 1,
  environment: "test",
  features: {
    compression: true,
    gzip: true,
    brotli: false
  }
};

function initializeApp() {
  console.log("Initializing compression test app...");
  console.log("Config:", JSON.stringify(CONFIG, null, 2));
  return true;
}

function processData(data) {
  return data.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
}

function calculateMetrics(items) {
  const total = items.length;
  const processed = items.filter(i => i.processed).length;
  return {
    total,
    processed,
    ratio: processed / total
  };
}

// 模拟更多代码以增加压缩效果差异
${Array.from(
  { length: 20 },
  (_, i) => `
function helperFunction${i}(input) {
  return input * ${i + 1} + Math.random();
}
`
).join('\n')}

export default {
  initializeApp,
  processData,
  calculateMetrics,
  CONFIG,
  REPEATED_DATA
};
  `.trim();

  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    bundleContent
  );

  // 创建 ZIP 文件
  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`, { stdio: 'pipe' });

  // 读取 ZIP 文件
  return Buffer.from(await Bun.file(zipPath).arrayBuffer());
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('📦 压缩支持测试 - 步骤 01: 上传资源');
  logger.info('='.repeat(60));

  try {
    // 加载测试上下文
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    // 1. 创建测试 Bundle
    logger.info('\n📦 创建测试 Bundle');
    logger.info('-'.repeat(60));

    const bundleZip = await createTestBundleZip();
    logger.info(`Bundle 创建完成 (${bundleZip.length} bytes)`);

    // 2. 上传 Bundle
    logger.info('\n🚀 上传 Bundle');
    logger.info('-'.repeat(60));

    const formData = new FormData();
    formData.append(
      'bundle',
      new Blob([new Uint8Array(bundleZip)]),
      'bundle.zip'
    );
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append(
      'metadata',
      JSON.stringify({
        test: 'compression',
        version: '1.0.0',
      })
    );

    const uploadUrl = `${BASE_URL}/trpc/hotUpdate.manage.updates.upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const update = result.result?.data?.update;

    if (!update?.id) {
      throw new Error('上传响应格式错误');
    }

    logger.info('✅ Bundle 上传成功');
    logger.info(`Update ID: ${update.id}`);

    // 3. 获取资源哈希（从 launchAsset 获取）
    // 上传响应中 launchAsset 结构与最终的 manifest 不同，需要适配
    const launchAsset = update.launchAsset;
    const launchAssetHash = launchAsset?.hash ?? launchAsset?.key;
    if (!launchAssetHash) {
      // 如果上传响应中没有直接的 hash，通过 updates API 查询
      logger.info('上传响应中没有 hash，稍后通过检查更新获取...');
    } else {
      logger.info(`Launch Asset Hash: ${launchAssetHash}`);
    }
    logger.info(
      `Launch Asset Size: ${launchAsset?.size ?? 'unknown'} bytes`
    );

    // 4. 保存测试上下文
    const updateIds = [...(ctx.updateIds ?? []), update.id];
    await saveTestContext({
      ...ctx,
      updateIds,
      // 保存更新 ID 供后续测试
      testUpdateId: update.id,
    });

    // 保存更新信息到临时文件供压缩测试使用
    // 需要在后续步骤中通过检查更新获取完整的 asset 信息
    await Bun.write(
      '/tmp/rapid-s-compression-test-update.json',
      JSON.stringify({
        updateId: update.id,
        channelKey: ctx.channelKey,
        launchAssetHash,
        launchAssetSize: launchAsset?.size,
      })
    );

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 资源上传完成！');
    logger.info('='.repeat(60));
    logger.info('\n资源详情:');
    logger.info(`  - Update ID: ${update.id}`);
    logger.info(`  - Runtime Version: ${update.runtimeVersion}`);
    if (launchAssetHash) {
      logger.info(`  - Asset Hash: ${launchAssetHash}`);
    }

    logger.info('\n💡 提示: 现在可以测试 gzip 压缩');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
