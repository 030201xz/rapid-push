/**
 * 签名场景 - 步骤 00: 环境准备
 *
 * 运行: bun run src/modules/hot-update/__test__/api/04-signing/00-setup.ts
 */

import {
  clearTestContext,
  createAnonymousClient,
  createTestLogger,
  DEMO_CONFIG,
  getManageApi,
  loginAsAdmin,
  saveTestContext,
} from '../../apis/_shared';

const logger = createTestLogger('Signing:00-Setup');

async function getOrganization(
  client: ReturnType<typeof createAnonymousClient>
) {
  const manage = getManageApi(client);
  const org = await manage.organizations.bySlug.query({
    slug: DEMO_CONFIG.organizationSlug,
  });
  if (!org) throw new Error('组织不存在');
  return org;
}

async function getProject(
  client: ReturnType<typeof createAnonymousClient>,
  organizationId: string
) {
  const manage = getManageApi(client);
  const project = await manage.projects.bySlug.query({
    organizationId,
    slug: DEMO_CONFIG.projectSlug,
  });
  if (!project) throw new Error('项目不存在');
  return project;
}

async function getProductionChannel(
  client: ReturnType<typeof createAnonymousClient>,
  projectId: string
) {
  const manage = getManageApi(client);
  const channels = await manage.channels.listByProject.query({
    projectId,
  });
  const channel = channels?.find(c => c.name === 'production');
  if (!channel) throw new Error('渠道不存在');
  return channel;
}

async function main() {
  logger.info('='.repeat(50));
  logger.info('🔐 签名场景 - 步骤 00: 环境准备');
  logger.info('='.repeat(50));

  try {
    await clearTestContext();

    const { accessToken, client } = await loginAsAdmin(logger);
    const org = await getOrganization(client);
    const project = await getProject(client, org.id);
    const channel = await getProductionChannel(client, project.id);

    logger.info('✅ 环境准备完成', {
      org: org.name,
      project: project.name,
      channel: channel.name,
    });

    await saveTestContext({
      accessToken,
      organizationId: org.id,
      projectId: project.id,
      channelId: channel.id,
      channelKey: channel.channelKey,
      updateIds: [],
      ruleIds: [],
    });

    logger.info('');
    logger.info('='.repeat(50));
    logger.info('✅ 步骤 00 完成！');
    logger.info('='.repeat(50));
    logger.info(
      '下一步: bun run .../04-signing/01-set-signing-keys.ts'
    );
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
