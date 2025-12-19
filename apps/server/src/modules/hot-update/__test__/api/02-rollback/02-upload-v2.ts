/**
 * 回滚场景 - 步骤 02: 上传 v2 有问题的版本
 *
 * 模拟发布了一个有 Bug 的版本，需要紧急回滚
 *
 * 运行: bun run src/modules/hot-update/__test__/api/02-rollback/02-upload-v2.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
  loadTestContext,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Rollback:02-UploadV2');

async function createV2BundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-rollback-v2';
  const zipPath = '/tmp/rapid-s-rollback-v2.zip';

  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略
  }

  mkdirSync(join(tmpDir, 'ios'), { recursive: true });
  mkdirSync(join(tmpDir, 'android'), { recursive: true });

  // 模拟有 Bug 的版本
  writeFileSync(
    join(tmpDir, 'ios', 'index.bundle'),
    `// iOS v2.0.0 - 有 Bug 的版本！
throw new Error("Critical bug in v2!");
export default { version: "2.0.0", buggy: true };`
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    `// Android v2.0.0 - 有 Bug 的版本！
throw new Error("Critical bug in v2!");
export default { version: "2.0.0", buggy: true };`
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);
  const buffer = await Bun.file(zipPath).arrayBuffer();
  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(buffer);
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('📦 回滚场景 - 步骤 02: 上传 v2（有问题的版本）');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.channelKey) {
      throw new Error('测试上下文不完整');
    }

    // 1. 上传 v2
    logger.info('1. 上传 v2 Bundle（模拟有 Bug 的版本）...');
    const bundleBuffer = await createV2BundleZip();

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', 'v2.0.0 - 有 Bug，需要回滚！');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({ version: 'v2', buggy: true })
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
    const v2UpdateId = result.result?.data?.update?.id;
    if (!v2UpdateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ v2 上传成功', { updateId: v2UpdateId });

    // 保存
    const updateIds = ctx.updateIds ?? [];
    updateIds.push(v2UpdateId);
    await saveTestContext({ updateIds });

    // 2. 验证客户端获取到 v2
    logger.info('2. 验证客户端获取到 v2...');
    const client = createAnonymousClient();
    const protocol = getProtocolApi(client);

    const checkResult = await protocol.manifest.check.query({
      channelKey: ctx.channelKey,
      runtimeVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'rollback-test-device',
    });

    if (checkResult.type === 'updateAvailable') {
      const isV2 = checkResult.manifest.id === v2UpdateId;
      logger.info('✅ 客户端获取到', {
        updateId: checkResult.manifest.id,
        isV2,
      });
      if (!isV2) {
        logger.warn('⚠️ 客户端未获取到 v2');
      }
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！v2 已发布（模拟线上出问题）');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../02-rollback/03-execute-rollback.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
