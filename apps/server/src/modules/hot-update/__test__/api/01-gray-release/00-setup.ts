/**
 * 灰度发布场景 - 步骤 00: 环境准备
 *
 * 复用基础工作流的登录逻辑，获取认证和渠道信息
 *
 * 运行: bun run src/modules/hot-update/__test__/api/01-gray-release/00-setup.ts
 */

import {
  clearTestContext,
  createAnonymousClient,
  createTestLogger,
  DEMO_CONFIG,
  getManageApi,
  loginAsAdmin,
  saveTestContext,
} from '../_shared';

const logger = createTestLogger('Gray:00-Setup');

// ========== 辅助函数 ==========

async function getOrganization(
  authedClient: ReturnType<typeof createAnonymousClient>
) {
  const manage = getManageApi(authedClient);
  const org = await manage.organizations.bySlug.query({
    slug: DEMO_CONFIG.organizationSlug,
  });
  if (!org) {
    throw new Error(`组织 ${DEMO_CONFIG.organizationSlug} 不存在`);
  }
  return org;
}

async function getProject(
  authedClient: ReturnType<typeof createAnonymousClient>,
  organizationId: string
) {
  const manage = getManageApi(authedClient);
  const project = await manage.projects.bySlug.query({
    organizationId,
    slug: DEMO_CONFIG.projectSlug,
  });
  if (!project) {
    throw new Error(`项目 ${DEMO_CONFIG.projectSlug} 不存在`);
  }
  return project;
}

async function getProductionChannel(
  authedClient: ReturnType<typeof createAnonymousClient>,
  projectId: string
) {
  const manage = getManageApi(authedClient);
  const channels = await manage.channels.listByProject.query({
    projectId,
  });
  const productionChannel = channels?.find(
    c => c.name === 'production'
  );
  if (!productionChannel) {
    throw new Error('Production 渠道不存在');
  }
  return productionChannel;
}

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('🎯 灰度发布场景 - 步骤 00: 环境准备');
  logger.info('='.repeat(50));

  try {
    await clearTestContext();

    // 1. 登录
    const { accessToken, client: authedClient } = await loginAsAdmin(
      logger
    );

    // 2. 获取组织/项目/渠道
    const org = await getOrganization(authedClient);
    logger.info('✅ 组织', { name: org.name });

    const project = await getProject(authedClient, org.id);
    logger.info('✅ 项目', { name: project.name });

    const channel = await getProductionChannel(
      authedClient,
      project.id
    );
    logger.info('✅ 渠道', {
      name: channel.name,
      key: channel.channelKey,
    });

    // 3. 保存上下文
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
    logger.info('下一步: bun run .../01-gray-release/01-upload.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
