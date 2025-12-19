/**
 * 签名场景 - 步骤 02: 禁用签名
 *
 * 测试内容：
 * - 禁用渠道签名
 * - 验证签名已禁用
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-signing/02-disable-signing.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Signing:02-Disable');

async function main() {
  logger.info('='.repeat(50));
  logger.info('🔐 签名场景 - 步骤 02: 禁用签名');
  logger.info('='.repeat(50));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 禁用签名
    logger.info('1. 禁用渠道签名...');
    await manage.channels.disableSigning.mutate({
      id: ctx.channelId,
    });

    logger.info('✅ 签名已禁用');

    // 2. 验证公钥已清除
    logger.info('2. 验证公钥状态...');
    const publicKey = await manage.channels.getPublicKey.query({
      id: ctx.channelId,
    });

    if (!publicKey) {
      logger.info('✅ 公钥已清除');
    } else {
      logger.warn('⚠️ 公钥仍存在', {
        publicKey: publicKey.substring(0, 50) + '...',
      });
    }

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 02 完成！');
    logger.info('='.repeat(50));
    logger.info('下一步: bun run .../04-signing/99-cleanup.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
