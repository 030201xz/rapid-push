/**
 * 灰度发布 - 步骤 01: 上传更新
 *
 * 测试内容：
 * - 创建测试 Bundle
 * - 上传更新并设置灰度比例为 50%
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/01-upload.ts
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

const logger = createTestLogger('GrayRelease:01-Upload');

/** 创建测试 Bundle ZIP */
async function createTestBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-gray-test';
  const zipPath = '/tmp/rapid-s-gray-test.zip';

  // 清理旧文件
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  // 创建目录结构
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  // 创建简单的 JS Bundle
  const bundleContent = `
// Gray Release Test Bundle
console.log('Gray release test bundle loaded');
export default { version: '1.0.0', grayRelease: true };
  `.trim();

  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    bundleContent
  );

  // 打包为 ZIP
  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`, {
    stdio: 'ignore',
  });

  // 读取 ZIP 文件
  const file = Bun.file(zipPath);
  const buffer = Buffer.from(await file.arrayBuffer());

  // 清理临时文件
  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(zipPath, { force: true });

  return buffer;
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('📦 灰度发布 - 步骤 01: 上传更新');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    // 创建 Bundle
    logger.info('\n📦 创建测试 Bundle');
    logger.info('-'.repeat(60));

    logger.info('创建测试 Bundle...');
    const bundleBuffer = await createTestBundleZip();
    logger.info(`Bundle 创建完成 (${bundleBuffer.length} bytes)`);

    // 使用 FormData 上传
    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '灰度发布测试更新');
    formData.append('rolloutPercentage', '50'); // 50% 灰度
    formData.append(
      'metadata',
      JSON.stringify({
        version: '1.0.0',
        grayRelease: 'true',
      })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    // 上传 Bundle
    logger.info('\n上传 Bundle (50% 灰度)...');
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

    logger.info('\n✅ 更新创建成功');
    logger.info(`Update ID: ${update.id}`);
    logger.info(`Rollout Percentage: ${update.rolloutPercentage}%`);

    // 保存 updateId 到上下文
    const updateIds = [...(ctx.updateIds ?? []), update.id];
    await saveTestContext({ updateIds, testUpdateId: update.id });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 灰度更新上传完成！');
    logger.info('='.repeat(60));

    logger.info('\n更新详情:');
    logger.info(`  - Update ID: ${update.id}`);
    logger.info(`  - Runtime Version: ${update.runtimeVersion}`);
    logger.info(
      `  - Rollout Percentage: ${update.rolloutPercentage}%`
    );
    logger.info(`  - Metadata:`, update.metadata);

    logger.info('\n💡 提示: 现在可以创建灰度规则');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
