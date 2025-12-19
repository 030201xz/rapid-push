/**
 * 01 - 上传热更新 Bundle
 *
 * 测试内容：
 * - 创建模拟 Bundle ZIP 文件
 * - 通过 FormData 上传到服务端
 * - 验证更新记录和资源已创建
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-create-update.ts
 */

import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  API_URL,
  createTestLogger,
  loadTestContext,
  saveTestContext,
} from '../apis/_shared';

const logger = createTestLogger('01-CreateUpdate');

// ========== 辅助函数 ==========

/** 创建模拟 Bundle ZIP（使用临时目录和系统 zip 命令） */
async function createMockBundleZip(): Promise<Buffer> {
  const tmpDir = '/tmp/rapid-s-test-bundle';
  const zipPath = '/tmp/rapid-s-test-bundle.zip';

  // 清理旧目录
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    rmSync(zipPath, { force: true });
  } catch {
    // 忽略错误
  }

  // 创建目录结构
  mkdirSync(join(tmpDir, 'ios'), { recursive: true });
  mkdirSync(join(tmpDir, 'android'), { recursive: true });
  mkdirSync(join(tmpDir, 'assets', 'fonts'), { recursive: true });

  // 写入模拟 Bundle 文件
  const iosBundleContent = `// iOS Bundle v1.0.0
console.log("Hello from iOS Hot Update!");
export default function App() {
  return { platform: "ios", version: "1.0.0", timestamp: ${Date.now()} };
}`;

  const androidBundleContent = `// Android Bundle v1.0.0
console.log("Hello from Android Hot Update!");
export default function App() {
  return { platform: "android", version: "1.0.0", timestamp: ${Date.now()} };
}`;

  writeFileSync(
    join(tmpDir, 'ios', 'index.bundle'),
    iosBundleContent
  );
  writeFileSync(
    join(tmpDir, 'android', 'index.bundle'),
    androidBundleContent
  );
  writeFileSync(
    join(tmpDir, 'assets', 'logo.png'),
    'fake-png-content'
  );
  writeFileSync(
    join(tmpDir, 'assets', 'fonts', 'Inter.ttf'),
    'fake-font'
  );

  // 使用系统 zip 命令打包
  execSync(`cd ${tmpDir} && zip -r ${zipPath} .`);

  // 读取 ZIP 文件
  const zipBuffer = await Bun.file(zipPath).arrayBuffer();

  // 清理
  rmSync(tmpDir, { recursive: true, force: true });

  return Buffer.from(zipBuffer);
}

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('📦 步骤 01: 上传热更新 Bundle');
  logger.info('='.repeat(50));

  try {
    // 加载测试上下文
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error(
        '测试上下文不存在，请先运行 00-login-and-get-data.ts'
      );
    }

    // 创建模拟 Bundle
    logger.info('创建模拟 Bundle ZIP...');
    const bundleBuffer = await createMockBundleZip();
    logger.info('✅ Bundle 创建完成', {
      size: `${bundleBuffer.length} bytes`,
    });

    // 构造 FormData
    const formData = new FormData();
    formData.append('channelId', ctx.channelId);
    formData.append('runtimeVersion', '1.0.0');
    formData.append(
      'description',
      `测试更新 v1 - ${new Date().toISOString()}`
    );
    formData.append('rolloutPercentage', '100');
    formData.append(
      'metadata',
      JSON.stringify({
        buildNumber: '1001',
        commitHash: 'abc123def456',
        branch: 'main',
      })
    );
    formData.append(
      'extra',
      JSON.stringify({
        testEnv: true,
        createdBy: 'api-test',
      })
    );

    // 创建 Blob 并追加为文件
    const bundleBlob = new Blob([new Uint8Array(bundleBuffer)], {
      type: 'application/zip',
    });
    formData.append('bundle', bundleBlob, 'bundle.zip');

    // 使用 fetch 直接调用 tRPC upload endpoint
    // tRPC 的 FormData 需要通过特殊方式处理
    logger.info('上传 Bundle...');
    const uploadUrl = `${API_URL}/hotUpdate.manage.updates.upload`;
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
    logger.info('✅ 上传成功', result);

    // 解析返回结果
    const updateId =
      result.result?.data?.update?.id || result.update?.id;
    const assetCount =
      result.result?.data?.assetCount || result.assetCount;

    if (!updateId) {
      throw new Error('未获取到更新 ID');
    }

    logger.info('✅ 更新创建成功', {
      id: updateId,
      assetCount,
    });

    // 保存更新 ID 到上下文
    const updateIds = ctx.updateIds ?? [];
    updateIds.push(updateId);
    await saveTestContext({ updateIds });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！更新 ID 已保存');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run src/modules/hot-update/__test__/api/02-check-manifest.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
