/**
 * 灰度发布场景 - 步骤 01: 上传更新并设置灰度
 *
 * 测试内容：
 * - 上传 Bundle
 * - 设置更新为 50% 灰度比例
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-gray-release/01-upload.ts
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
} from '../../apis/_shared';

const logger = createTestLogger('Gray:01-Upload');

// ========== 辅助函数 ==========

async function createMockBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-gray-bundle';
  const zipPath = '/tmp/rapid-s-gray-bundle.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'ios'), { recursive: true });
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  writeFileSync(
    join(tmpDir, 'ios', 'index.bundle'),
    `// iOS Gray Bundle\nexport default { version: "gray-1.0", ts: ${Date.now()} };`
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    `// Android Gray Bundle\nexport default { version: "gray-1.0", ts: ${Date.now()} };`
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);
  const zipBuffer = await Bun.file(zipPath).arrayBuffer();
  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(zipBuffer);
}

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('📦 灰度发布场景 - 步骤 01: 上传更新');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不存在，请先运行 00-setup.ts');
    }

    // 1. 创建并上传 Bundle
    logger.info('创建并上传 Bundle...');
    const bundleBuffer = await createMockBundleZip();

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append(
      'description',
      `灰度测试更新 - ${new Date().toISOString()}`
    );
    formData.append('rolloutPercentage', '100'); // 先设为 100%，后面再改
    formData.append(
      'metadata',
      JSON.stringify({ type: 'gray-test' })
    );

    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    const response = await fetch(
      `${API_URL}/hotUpdate.manage.updates.upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status}`);
    }

    const result = await response.json();
    const updateId =
      result.result?.data?.update?.id || result.update?.id;
    if (!updateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ 上传成功', { updateId });

    // 2. 修改灰度比例为 50%
    logger.info('设置灰度比例为 50%...');
    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    await manage.updates.updateSettings.mutate({
      id: updateId,
      rolloutPercentage: 50,
    });
    logger.info('✅ 灰度比例已设置为 50%');

    // 保存更新 ID
    const updateIds = ctx.updateIds ?? [];
    updateIds.push(updateId);
    await saveTestContext({ updateIds });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../01-gray-release/02-create-rules.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
