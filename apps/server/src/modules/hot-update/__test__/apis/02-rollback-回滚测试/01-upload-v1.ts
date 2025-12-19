/**
 * 回滚测试 - 步骤 01: 上传 v1 版本
 *
 * 测试内容：
 * - 上传第一个正常版本 v1
 * - 验证上传成功
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/02-rollback-回滚测试/01-upload-v1.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createTestLogger,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Rollback:01-UploadV1');

/** 创建 v1 Bundle */
async function createV1BundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-rollback-v1';
  const zipPath = '/tmp/rapid-s-rollback-v1.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  const bundleContent = `
// Rollback Test v1
console.log('Version 1.0 loaded');
export default { version: '1.0', stable: true };
  `.trim();

  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    bundleContent
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`, {
    stdio: 'ignore',
  });

  const file = Bun.file(zipPath);
  const buffer = Buffer.from(await file.arrayBuffer());

  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });

  return buffer;
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('📦 回滚测试 - 步骤 01: 上传 v1 版本');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    logger.info('\n📦 创建 v1 Bundle');
    logger.info('-'.repeat(60));

    const bundleBuffer = await createV1BundleZip();
    logger.info(`Bundle 创建完成 (${bundleBuffer.length} bytes)`);

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '版本 v1 - 稳定版本');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({
        version: 'v1',
        stable: 'true',
      })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    logger.info('上传 v1 Bundle...');
    const uploadUrl = `${API_URL}/hotUpdate.manage.updates.upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const result = await response.json();
    const update = result.result?.data?.update;
    if (!update) {
      throw new Error('上传失败：未返回更新信息');
    }

    logger.info('\n✅ v1 上传成功');
    logger.info(`Update ID: ${update.id}`);

    const updateIds = [...(ctx.updateIds ?? []), update.id];
    await saveTestContext({ updateIds });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ v1 版本上传完成！');
    logger.info('='.repeat(60));

    logger.info('\n更新详情:');
    logger.info(`  - Update ID: ${update.id}`);
    logger.info(`  - Version: v1`);
    logger.info(`  - Metadata:`, update.metadata);

    logger.info('\n💡 提示: 现在可以上传 v2 版本');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
