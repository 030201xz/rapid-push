/**
 * 代码签名测试 - 步骤 03: 验证签名
 *
 * 测试内容：
 * - 客户端检查更新
 * - 验证响应中包含签名字段
 * - 使用公钥验证签名正确性
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/03-check-signature.ts
 */

import { verifyManifestSignature } from '@/common/crypto';
import {
  createAnonymousClient,
  createTestLogger,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Signing:03-CheckSignature');

async function main() {
  logger.info('='.repeat(60));
  logger.info('✅ 代码签名测试 - 步骤 03: 验证签名');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.channelKey || !ctx.publicKey || !ctx.testUpdateId) {
      throw new Error('测试上下文不完整，请先运行前面的步骤');
    }

    logger.info('\n🔍 客户端检查更新');
    logger.info('-'.repeat(60));
    logger.info(`Channel Key: ${ctx.channelKey}`);
    logger.info(`Update ID: ${ctx.testUpdateId}`);

    const client = createAnonymousClient();
    const checkResult =
      await client.hotUpdate.protocol.manifest.check.query({
        channelKey: ctx.channelKey,
        runtimeVersion: '1.0.0',
        platform: 'android',
      });

    logger.info('\n📦 响应结果:');
    logger.info(JSON.stringify(checkResult, null, 2));

    if (checkResult.type !== 'updateAvailable') {
      throw new Error(`期望收到更新，实际收到: ${checkResult.type}`);
    }

    if (!checkResult.signature) {
      throw new Error('响应中缺少签名字段');
    }

    logger.info('\n✅ 响应包含签名');
    logger.info(
      `Signature: ${checkResult.signature.substring(0, 50)}...`
    );

    logger.info('\n🔐 验证签名');
    logger.info('-'.repeat(60));

    const { manifest, signature } = checkResult;

    try {
      // verifyManifestSignature 需要 JSON 字符串
      const manifestJson = JSON.stringify(manifest);
      const isValid = verifyManifestSignature(
        manifestJson,
        signature,
        ctx.publicKey
      );

      if (!isValid) {
        throw new Error('签名验证失败');
      }

      logger.info('✅ 签名验证通过');

      logger.info('\n' + '='.repeat(60));
      logger.info('✅ 签名验证完成！');
      logger.info('='.repeat(60));

      logger.info('\n验证详情:');
      logger.info(`  - Update ID: ${manifest.id}`);
      logger.info(`  - Signature 长度: ${signature.length}`);
      logger.info(`  - 签名算法: RSA-SHA256`);
      logger.info(`  - 验证结果: ✅ 通过`);

      logger.info('\n💡 测试结论:');
      logger.info('  - ✅ 服务端正确生成签名');
      logger.info('  - ✅ 客户端可以验证签名');
      logger.info('  - ✅ 代码签名功能正常');
    } catch (error) {
      logger.error('❌ 签名验证失败:', error);
      throw error;
    }
  } catch (error) {
    logger.error('❌ 测试失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
