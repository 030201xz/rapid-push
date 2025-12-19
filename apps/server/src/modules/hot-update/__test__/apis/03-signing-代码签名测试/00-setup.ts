/**
 * 代码签名测试 - 步骤 00: 环境初始化
 *
 * 测试内容：
 * - 管理员登录
 * - 创建测试组织、项目、渠道
 * - 生成 RSA 密钥对
 * - 保存测试上下文
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/00-setup.ts
 */

import crypto from 'node:crypto';
import {
  createTestLogger,
  loginAsAdmin,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Signing:00-Setup');

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
  logger.info('='.repeat(60));
  logger.info('🎯 代码签名测试 - 步骤 00: 初始化测试环境');
  logger.info('='.repeat(60));

  try {
    logger.info('\n📝 步骤 1: 管理员登录');
    logger.info('-'.repeat(60));
    const { accessToken, client } = await loginAsAdmin(logger);

    logger.info('\n📝 步骤 2: 创建测试组织');
    logger.info('-'.repeat(60));
    const organization =
      await client.hotUpdate.manage.organizations.create.mutate({
        name: 'Signing Test Org',
        slug: `signing-test-${Date.now()}`,
        description: '代码签名测试组织',
      });
    logger.info('✅ 测试组织已创建', { id: organization.id });

    logger.info('\n📝 步骤 3: 创建测试项目');
    logger.info('-'.repeat(60));
    const project =
      await client.hotUpdate.manage.projects.create.mutate({
        organizationId: organization.id,
        name: 'Signing Test Project',
        slug: `signing-test-${Date.now()}`,
        description: '代码签名测试项目',
      });
    logger.info('✅ 测试项目已创建', { id: project.id });

    logger.info('\n📝 步骤 4: 创建测试渠道');
    logger.info('-'.repeat(60));
    const channel =
      await client.hotUpdate.manage.channels.create.mutate({
        projectId: project.id,
        name: 'Signing Test Channel',
        description: '代码签名测试渠道',
      });
    logger.info('✅ 测试渠道已创建', {
      id: channel.id,
      key: channel.channelKey,
    });

    logger.info('\n📝 步骤 5: 生成 RSA 密钥对');
    logger.info('-'.repeat(60));
    const { publicKey, privateKey } = generateKeyPair();
    logger.info('✅ RSA 密钥对已生成', {
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
    });

    await saveTestContext({
      accessToken,
      organizationId: organization.id,
      projectId: project.id,
      channelId: channel.id,
      channelKey: channel.channelKey,
      publicKey,
      privateKey,
    });

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ 环境初始化完成！');
    logger.info('='.repeat(60));

    logger.info('\n✅ 测试上下文已保存:');
    logger.info(`  - Organization ID: ${organization.id}`);
    logger.info(`  - Project ID: ${project.id}`);
    logger.info(`  - Channel ID: ${channel.id}`);
    logger.info(`  - Channel Key: ${channel.channelKey}`);
    logger.info(`  - Public Key: ${publicKey.substring(0, 50)}...`);
    logger.info(`  - Private Key: ${privateKey.substring(0, 50)}...`);

    logger.info('\n💡 提示: 现在可以配置 Channel 代码签名');
  } catch (error) {
    logger.error('❌ 初始化失败:', error);
    throw error;
  }
}

main().catch(err => {
  logger.error('测试执行失败:', err);
  process.exit(1);
});
