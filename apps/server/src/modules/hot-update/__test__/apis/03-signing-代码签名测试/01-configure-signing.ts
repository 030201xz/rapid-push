/**
 * 代码签名测试 - 步骤 01: 配置代码签名
 *
 * 测试内容：
 * - 为 Channel 设置公钥
 * - 启用代码签名功能
 * - 验证公钥配置成功
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/01-configure-signing.ts
 */

import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
} from '../_shared';

const logger = createTestLogger('Signing:01-Configure');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🔐 代码签名测试 - 步骤 01: 配置代码签名');
  logger.info('='.repeat(60));

  try {
    const ctx = await loadTestContext();
    if (!ctx.accessToken || !ctx.channelId || !ctx.publicKey) {
      throw new Error('测试上下文不完整，请先运行 00-setup.ts');
    }

    logger.info('\n📝 为 Channel 设置公钥');
    logger.info('-'.repeat(60));
    logger.info(`Channel ID: ${ctx.channelId}`);
    logger.info(`Public Key: ${ctx.publicKey.substring(0, 50)}...`);

    const setKeysUrl = `${API_URL}/hotUpdate.manage.channels.setSigningKeys`;
    const response = await fetch(setKeysUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: ctx.channelId,
        publicKey: ctx.publicKey,
        privateKey: ctx.privateKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `设置公钥失败: ${response.status} - ${errorText}`
      );
    }

    const result = await response.json();
    logger.info('✅ 公钥设置成功');
    logger.info(JSON.stringify(result.result?.data, null, 2));

    logger.info('\n📝 验证公钥配置');
    logger.info('-'.repeat(60));

    // 使用 tRPC Client 获取公钥
    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);
    const retrievedKey = await manage.channels.getPublicKey.query({
      id: ctx.channelId,
    });

    if (!retrievedKey) {
      throw new Error('未能获取到公钥');
    }

    if (retrievedKey !== ctx.publicKey) {
      throw new Error('获取的公钥与设置的不一致');
    }

    logger.info('✅ 公钥验证成功');

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 代码签名配置完成！');
    logger.info('='.repeat(60));

    logger.info('\n📝 配置详情:');
    logger.info(`  - Channel ID: ${ctx.channelId}`);
    logger.info(`  - 公钥已设置: ✅`);
    logger.info(`  - 公钥已验证: ✅`);

    logger.info('\n💡 提示: 现在可以上传签名的更新');
  } catch (error) {
    logger.error('❌ 配置失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
