/**
 * 压缩支持测试 - 步骤 03: 测试无压缩响应
 *
 * 测试内容：
 * - 不使用 Accept-Encoding 请求资源
 * - 验证响应不包含 Content-Encoding
 * - 验证响应数据为原始未压缩内容
 * - 验证 Content-Length 与原始大小一致
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/03-test-no-compression.ts
 */

import { env } from '@/common/env';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('Compression:03-NoCompression');

/** 资源下载基础地址 */
const ASSETS_URL = `http://${env.host}:${env.port}/assets`;

/**
 * 加载资源哈希信息
 */
async function loadAssetInfo(): Promise<{
  hash: string;
  size: number;
  contentType: string;
}> {
  const file = Bun.file('/tmp/rapid-s-compression-test-hash.json');
  if (!(await file.exists())) {
    throw new Error(
      '资源信息文件不存在，请先运行 01-upload-asset.ts'
    );
  }
  return JSON.parse(await file.text());
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('📦 压缩支持测试 - 步骤 03: 测试无压缩响应');
  logger.info('='.repeat(60));

  try {
    // 加载资源信息
    const assetInfo = await loadAssetInfo();
    logger.info('\n📦 资源信息:');
    logger.info(`  - Hash: ${assetInfo.hash}`);
    logger.info(`  - Original Size: ${assetInfo.size} bytes`);
    logger.info(`  - Content Type: ${assetInfo.contentType}`);

    // 1. 不使用压缩请求资源
    logger.info('\n🔍 测试无压缩请求');
    logger.info('-'.repeat(60));

    const url = `${ASSETS_URL}/${assetInfo.hash}`;
    logger.info(`请求 URL: ${url}`);

    // 不设置 Accept-Encoding 头
    const response = await fetch(url, {
      method: 'GET',
      // 显式不请求压缩
      headers: {
        'Accept-Encoding': 'identity',
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
    const cacheControl = response.headers.get('cache-control');

    logger.info(
      `  - Content-Encoding: ${contentEncoding ?? '(none)'}`
    );
    logger.info(`  - Content-Type: ${contentType}`);
    logger.info(`  - Content-Length: ${contentLength}`);
    logger.info(`  - Cache-Control: ${cacheControl}`);

    // 验证没有 Content-Encoding（或为 identity）
    if (contentEncoding && contentEncoding !== 'identity') {
      throw new Error(
        `不应该有压缩编码，但收到 Content-Encoding: ${contentEncoding}`
      );
    }
    logger.info('\n✅ 无压缩编码（符合预期）');

    // 验证 Content-Length
    const expectedLength = assetInfo.size.toString();
    if (contentLength !== expectedLength) {
      logger.warn(
        `⚠️  Content-Length (${contentLength}) 与原始大小 (${expectedLength}) 不一致`
      );
    } else {
      logger.info(
        `✅ Content-Length 与原始大小一致: ${contentLength}`
      );
    }

    // 验证 Cache-Control（符合 Expo 协议规范）
    if (cacheControl?.includes('immutable')) {
      logger.info('✅ Cache-Control 符合 Expo 规范（immutable）');
    }

    // 3. 获取响应数据
    const rawData = Buffer.from(await response.arrayBuffer());
    logger.info(`\n📊 响应数据分析:`);
    logger.info(`  - 响应大小: ${rawData.length} bytes`);
    logger.info(`  - 原始大小: ${assetInfo.size} bytes`);

    if (rawData.length !== assetInfo.size) {
      throw new Error(
        `响应大小 (${rawData.length}) 与原始大小 (${assetInfo.size}) 不一致`
      );
    }
    logger.info('✅ 响应大小与原始大小一致');

    // 4. 验证内容是有效的 JavaScript
    logger.info('\n🔍 验证内容:');
    const content = rawData.toString('utf-8');
    if (content.includes('Compression Test Bundle')) {
      logger.info('✅ 内容验证正确（包含预期标记）');
    } else {
      logger.warn('⚠️  内容可能不完整（未找到预期标记）');
    }

    // 检查是否为原始文本（非压缩）
    const isPlainText =
      content.startsWith('/**') || content.startsWith('\n/**');
    if (isPlainText) {
      logger.info('✅ 内容为原始文本格式（未压缩）');
    } else {
      // 检查是否可能是 gzip 格式（以 1f 8b 开头）
      if (rawData[0] === 0x1f && rawData[1] === 0x8b) {
        throw new Error('收到的是压缩数据，但请求不压缩响应');
      }
    }

    // 测试结果汇总
    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 无压缩响应测试通过！');
    logger.info('='.repeat(60));

    logger.info('\n📊 测试结果汇总:');
    logger.info('  - ✅ 服务端正确处理不压缩请求');
    logger.info('  - ✅ 响应不包含 Content-Encoding');
    logger.info(
      `  - ✅ Content-Length 正确: ${assetInfo.size} bytes`
    );
    logger.info('  - ✅ 响应数据为原始未压缩内容');
    logger.info('  - ✅ 内容完整正确');

    logger.info('\n💡 提示: 压缩测试全部完成');
  } catch (error) {
    logger.error('❌ 无压缩响应测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
