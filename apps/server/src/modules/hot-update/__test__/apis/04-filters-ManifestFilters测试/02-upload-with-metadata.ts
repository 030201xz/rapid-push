/**
 * Manifest Filters - 步骤 02: 上传带元数据的更新
 *
 * 测试内容：
 * - 创建带 metadata 的更新
 * - metadata 包含与 filterKeys 对应的字段
 * - 上传资产和 manifest
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/04-filters/02-upload-with-metadata.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../../api/_shared';

const logger = createTestLogger('Filters:02-Upload');

/**
 * 创建最小化的测试 Bundle ZIP
 */
async function createTestBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-filters-test';
  const zipPath = '/tmp/rapid-s-filters-test.zip';

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
// Filters Test Bundle
console.log('Filters test bundle loaded');
export default { message: 'Hello from filters test' };
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
  logger.info('📦 Manifest Filters - 步骤 02: 上传带元数据的更新');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 创建更新 - 通过上传 Bundle
    logger.info('\n📦 创建带 metadata 的更新');
    logger.info('-'.repeat(60));

    const metadata = {
      branch: 'main',
      environment: 'staging',
      releaseChannel: 'preview',
      buildNumber: '123',
      commitHash: 'abc123def',
    };

    logger.info('Metadata:', metadata);

    // 创建 Bundle ZIP
    logger.info('创建测试 Bundle...');
    const bundleBuffer = await createTestBundleZip();
    logger.info(`Bundle 创建完成 (${bundleBuffer.length} bytes)`);

    // 使用 FormData 上传
    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', 'Filters Test Update');
    formData.append('rolloutPercentage', '100');
    formData.append('metadata', JSON.stringify(metadata));

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    // 上传
    logger.info('上传 Bundle...');
    const uploadUrl = `${API_URL}/hotUpdate.manage.updates.upload`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const updateId =
      result.result?.data?.update?.id || result.update?.id;

    if (!updateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('\n✅ 更新创建成功');
    logger.info(`Update ID: ${updateId}`);

    // 保存上下文
    await saveTestContext({
      testUpdateId: updateId,
      testMetadata: metadata,
    });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 带元数据的更新上传完成！');
    logger.info('='.repeat(60));

    logger.info('\n更新详情:');
    logger.info(`  - Update ID: ${updateId}`);
    logger.info(`  - Metadata:`, metadata);

    logger.info('\n💡 提示: 现在可以验证 Manifest Filters 响应头');
  } catch (error) {
    logger.error('❌ 上传失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
