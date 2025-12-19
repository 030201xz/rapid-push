/**
 * 签名场景 - 步骤 01: 设置签名密钥
 *
 * 测试内容：
 * - 生成 RSA 密钥对
 * - 设置渠道签名密钥
 * - 验证公钥获取
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-signing/01-set-signing-keys.ts
 */

import crypto from 'node:crypto';
import {
  API_URL,
  createClient,
  createTestLogger,
  getManageApi,
  loadTestContext,
  saveTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Signing:01-SetKeys');

// 扩展 TestContext
interface ExtendedContext {
  accessToken?: string;
  channelId?: string;
  publicKey?: string;
  privateKey?: string;
}

/** 生成 RSA 密钥对 */
function generateKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync(
    'rsa',
    {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    }
  );

  return { publicKey, privateKey };
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('🔐 签名场景 - 步骤 01: 设置签名密钥');
  logger.info('='.repeat(50));

  try {
    const ctx = (await loadTestContext()) as ExtendedContext;
    if (!ctx.accessToken || !ctx.channelId) {
      throw new Error('测试上下文不完整');
    }

    const client = createClient(API_URL, { token: ctx.accessToken });
    const manage = getManageApi(client);

    // 1. 生成密钥对
    logger.info('1. 生成 RSA 2048 密钥对...');
    const { publicKey, privateKey } = generateKeyPair();

    logger.info('✅ 密钥对生成成功', {
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
    });

    // 2. 设置渠道签名密钥
    logger.info('2. 设置渠道签名密钥...');
    await manage.channels.setSigningKeys.mutate({
      id: ctx.channelId,
      publicKey,
      privateKey,
    });

    logger.info('✅ 签名密钥已设置');

    // 保存公钥到上下文（用于后续验证）
    await saveTestContext({ publicKey, privateKey });

    // 3. 获取公钥验证
    logger.info('3. 获取公钥验证...');
    const retrievedPublicKey =
      await manage.channels.getPublicKey.query({
        id: ctx.channelId,
      });

    if (retrievedPublicKey === publicKey) {
      logger.info('✅ 公钥验证通过');
    } else {
      logger.warn('⚠️ 公钥不匹配');
    }

    // 4. 显示公钥（用于客户端配置）
    logger.info('4. 公钥信息（用于客户端 app.json 配置）');
    logger.info('公钥内容：');
    console.log(publicKey);

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 01 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../04-signing/02-disable-signing.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
