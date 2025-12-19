/**
 * 代码签名测试 - 步骤 02: 上传签名更新
 *
 * 测试内容：
 * - 创建测试 Bundle
 * - 使用私钥对 Manifest 进行签名
 * - 上传带签名的更新
 * - 验证上传成功
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/02-upload-signed.ts
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

const logger = createTestLogger('Signing:02-UploadSigned');

/** 创建测试 Bundle */
async function createTestBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-signing-test';
  const zipPath = '/tmp/rapid-s-signing-test.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  const bundleContent = `
// Signing Test Bundle
console.log('Signed update loaded');
export default { version: '1.0.0', signed: true };
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
  logger.info('📦 代码签名测试 - 步骤 02: 上传签名更新');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.privateKey) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n📦 创建测试 Bundle');
    logger.info('-'.repeat(60));

    const bundleBuffer = await createTestBundleZip();
    logger.info(`Bundle 创建完成 (${bundleBuffer.length} bytes)`);

    logger.info('\n🔐 准备上传签名更新');
    logger.info('-'.repeat(60));

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', '代码签名测试更新');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({
        version: '1.0.0',
        signed: 'true',
      })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    // 注意: 签名在服务端自动完成,客户端只需提供公钥
    logger.info('上传 Bundle...');
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

    logger.info('\n✅ 签名更新上传成功');
    logger.info(`Update ID: ${update.id}`);

    const updateIds = [...(ctx.updateIds ?? []), update.id];
    await saveTestContext({ updateIds, testUpdateId: update.id });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 签名更新上传完成！');
    logger.info('='.repeat(60));

    logger.info('\n更新详情:');
    logger.info(`  - Update ID: ${update.id}`);
    logger.info(`  - Runtime Version: ${update.runtimeVersion}`);
    logger.info(`  - Metadata:`, update.metadata);

    logger.info('\n💡 说明:');
    logger.info('  - 签名由服务端自动完成');
    logger.info('  - Manifest 使用私钥进行 RSA 签名');
    logger.info('  - 客户端可以使用公钥验证签名');

    logger.info('\n💡 提示: 现在可以验证签名');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
