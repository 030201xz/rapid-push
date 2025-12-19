/**
 * 回滚测试 - 步骤 02: 上传 v2 有问题的版本
 *
 * 测试内容：
 * - 上传第二个有问题的版本 v2
 * - 模拟发布了有 Bug 的版本
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/02-rollback-回滚测试/02-upload-v2.ts
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

const logger = createTestLogger('Rollback:02-UploadV2');

/** 创建 v2 Bundle（有问题的版本） */
async function createV2BundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-rollback-v2';
  const zipPath = '/tmp/rapid-s-rollback-v2.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  const bundleContent = `
// Rollback Test v2 (BUGGY)
console.log('Version 2.0 loaded - Has Critical Bug!');
export default { version: '2.0', buggy: true, crash: () => { throw new Error('Critical Bug!'); } };
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
  logger.info('📦 回滚测试 - 步骤 02: 上传 v2 有问题的版本');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n📦 创建 v2 Bundle (有 Bug)');
    logger.info('-'.repeat(60));

    const bundleBuffer = await createV2BundleZip();
    logger.info(`Bundle 创建完成 (${bundleBuffer.length} bytes)`);

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '版本 v2 - 有严重 Bug，需要回滚');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({
        version: 'v2',
        buggy: 'true',
      })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    logger.info('上传 v2 Bundle (有问题的版本)...');
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

    logger.info('\n✅ v2 上传成功');
    logger.info(`Update ID: ${update.id}`);

    const updateIds = [...(ctx.updateIds ?? []), update.id];
    await saveTestContext({ updateIds, testUpdateId: update.id });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ v2 版本上传完成！');
    logger.info('='.repeat(60));

    logger.info('\n更新详情:');
    logger.info(`  - Update ID: ${update.id}`);
    logger.info(`  - Version: v2 (有 Bug)`);
    logger.info(`  - Metadata:`, update.metadata);

    logger.info('\n💡 提示: 现在可以创建回滚指令');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
