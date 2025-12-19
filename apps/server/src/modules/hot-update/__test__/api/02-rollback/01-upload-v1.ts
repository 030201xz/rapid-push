/**
 * 回滚场景 - 步骤 01: 上传 v1 稳定版本
 *
 * 运行: bun run src/modules/hot-update/__test__/api/02-rollback/01-upload-v1.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createTestLogger,
  loadTestContext,
  saveTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Rollback:01-UploadV1');

async function createV1BundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-rollback-v1';
  const zipPath = '/tmp/rapid-s-rollback-v1.zip';

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
    `// iOS v1.0.0 - 稳定版本\nexport default { version: "1.0.0", stable: true, ts: ${Date.now()} };`
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    `// Android v1.0.0 - 稳定版本\nexport default { version: "1.0.0", stable: true, ts: ${Date.now()} };`
  );

  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);
  const buffer = await Bun.file(zipPath).arrayBuffer();
  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(buffer);
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('📦 回滚场景 - 步骤 01: 上传 v1 稳定版本');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不存在');
    }

    // 上传 v1
    logger.info('创建并上传 v1 Bundle...');
    const bundleBuffer = await createV1BundleZip();

    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append('description', 'v1.0.0 - 稳定版本（回滚目标）');
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({ version: 'v1', stable: true })
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
    const v1UpdateId = result.result?.data?.update?.id;
    if (!v1UpdateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ v1 上传成功', { updateId: v1UpdateId });

    // 保存
    const updateIds = ctx.updateIds ?? [];
    updateIds.push(v1UpdateId);
    await saveTestContext({ updateIds });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../02-rollback/02-upload-v2.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
