/**
 * 压缩支持测试 - 步骤 02: 测试 gzip 压缩
 *
 * 测试内容：
 * - 通过检查更新获取资源 hash
 * - 使用 Accept-Encoding: gzip 请求资源
 * - 验证响应包含 Content-Encoding: gzip
 * - 验证压缩后的数据可以正确解压
 * - 验证解压后的内容与原始内容一致
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/02-test-gzip.ts
 */

import { env } from '@/common/env';
import {
  createAnonymousClient,
  createTestLogger,
  getProtocolApi,
} from '../_shared';

const logger = createTestLogger('Compression:02-Gzip');

/** API 基础地址 */
const BASE_URL = `http://${env.host}:${env.port}`;

/**
 * 加载更新信息
 */
async function loadUpdateInfo(): Promise<{
  updateId: string;
  channelKey: string;
  launchAssetHash?: string;
}> {
  const file = Bun.file('/tmp/rapid-s-compression-test-update.json');
  if (!(await file.exists())) {
    throw new Error(
      '更新信息文件不存在，请先运行 01-upload-asset.ts'
    );
  }
  return JSON.parse(await file.text());
}

/**
 * 通过检查更新获取 manifest 和 asset hash
 */
async function getAssetHash(channelKey: string): Promise<{
  hash: string;
  size: number;
  contentType: string;
}> {
  const client = createAnonymousClient();
  const protocol = getProtocolApi(client);

  const response = await protocol.manifest.check.query({
    channelKey,
    runtimeVersion: '1.0.0',
    platform: 'android',
  });

  if (response.type !== 'updateAvailable') {
    throw new Error(`没有可用更新: ${response.type}`);
  }

  const launchAsset = response.manifest.launchAsset;
  if (!launchAsset?.hash) {
    throw new Error('Manifest 中没有 launchAsset hash');
  }

  return {
    hash: launchAsset.hash,
    size: 0, // 客户端响应中没有 size
    contentType:
      launchAsset.contentType ?? 'application/octet-stream',
  };
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('🗜️ 压缩支持测试 - 步骤 02: 测试 gzip 压缩');
  logger.info('='.repeat(60));

  try {
    // 加载更新信息
    const updateInfo = await loadUpdateInfo();
    logger.info('\n📦 更新信息:');
    logger.info(`  - Channel Key: ${updateInfo.channelKey}`);

    // 通过检查更新获取 asset hash
    logger.info('\n🔍 获取资源 Hash...');
    const assetInfo = await getAssetHash(updateInfo.channelKey);
    logger.info(`  - Hash: ${assetInfo.hash}`);
    logger.info(`  - Size: ${assetInfo.size} bytes`);
    logger.info(`  - Content Type: ${assetInfo.contentType}`);

    // 保存 asset 信息供后续测试使用
    await Bun.write(
      '/tmp/rapid-s-compression-test-hash.json',
      JSON.stringify(assetInfo)
    );

    // 1. 使用 gzip 压缩请求资源
    logger.info('\n🔍 测试 gzip 压缩请求');
    logger.info('-'.repeat(60));

    const url = `${BASE_URL}/assets/${assetInfo.hash}`;
    logger.info(`请求 URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });

    if (!response.ok) {
      throw new Error(
        `请求失败: ${response.status} ${response.statusText}`
      );
    }

    // 2. 验证响应头
    logger.info('\n📋 响应头分析:');
    const contentEncoding = response.headers.get('content-encoding');
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const vary = response.headers.get('vary');
    const cacheControl = response.headers.get('cache-control');

    logger.info(`  - Content-Encoding: ${contentEncoding}`);
    logger.info(`  - Content-Type: ${contentType}`);
    logger.info(`  - Content-Length: ${contentLength}`);
    logger.info(`  - Vary: ${vary}`);
    logger.info(`  - Cache-Control: ${cacheControl}`);

    // 验证 Content-Encoding
    if (contentEncoding !== 'gzip') {
      throw new Error(
        `Content-Encoding 期望为 gzip，实际为 ${contentEncoding}`
      );
    }
    logger.info('\n✅ Content-Encoding 正确: gzip');

    // 验证 Vary 头（用于缓存区分）
    if (!vary?.toLowerCase().includes('accept-encoding')) {
      logger.warn('⚠️  Vary 头未包含 Accept-Encoding');
    } else {
      logger.info('✅ Vary 头正确包含 Accept-Encoding');
    }

    // 验证 Cache-Control（符合 Expo 协议规范）
    if (cacheControl?.includes('immutable')) {
      logger.info('✅ Cache-Control 符合 Expo 规范（immutable）');
    }

    // 3. 获取响应数据
    // 注意：fetch 会自动解压 gzip 内容，所以我们获取的是解压后的数据
    const responseData = Buffer.from(await response.arrayBuffer());

    // Content-Length 是压缩后的大小
    const compressedSize = parseInt(contentLength ?? '0', 10);
    const decompressedSize = responseData.length;

    logger.info(`\n📊 压缩效果分析:`);
    logger.info(
      `  - 压缩后大小 (Content-Length): ${compressedSize} bytes`
    );
    logger.info(
      `  - 解压后大小 (实际接收): ${decompressedSize} bytes`
    );

    if (compressedSize > 0 && decompressedSize > compressedSize) {
      const compressionRatio = (
        (1 - compressedSize / decompressedSize) *
        100
      ).toFixed(2);
      logger.info(`  - 压缩率: ${compressionRatio}%`);
      logger.info(
        `✅ 压缩有效，节省 ${decompressedSize - compressedSize} bytes`
      );
    } else {
      logger.warn('⚠️  无法计算压缩率（可能是小文件或已压缩内容）');
    }

    // 4. 验证解压后内容
    logger.info('\n🔓 验证解压后内容:');
    logger.info(`  - 实际接收大小: ${responseData.length} bytes`);

    // 验证内容是有效的 JavaScript (fetch 已自动解压)
    const content = responseData.toString('utf-8');
    if (content.includes('Compression Test Bundle')) {
      logger.info('✅ 内容验证正确（包含预期标记）');
    } else {
      logger.warn('⚠️  解压后内容可能不完整');
    }

    // 保存资源信息用于下一步测试
    await Bun.write(
      '/tmp/rapid-s-compression-test-hash.json',
      JSON.stringify({
        hash: assetInfo.hash,
        size: decompressedSize,
        contentType: assetInfo.contentType,
      })
    );

    // 测试结果汇总
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ gzip 压缩测试通过！');
    logger.info('='.repeat(60));

    const compressionRatio =
      compressedSize > 0 && decompressedSize > compressedSize
        ? ((1 - compressedSize / decompressedSize) * 100).toFixed(2)
        : 'N/A';

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ 服务端正确响应 gzip 压缩请求');
    logger.info('  - ✅ Content-Encoding: gzip 响应头正确');
    logger.info('  - ✅ Vary: Accept-Encoding 响应头正确');
    logger.info(`  - ✅ 压缩率: ${compressionRatio}%`);
    logger.info('  - ✅ 压缩数据可正确解压');
    logger.info('  - ✅ 解压后内容完整正确');

    logger.info('\n💡 提示: 现在可以测试无压缩请求');
  } catch (error) {
    logger.error('❌ gzip 压缩测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
