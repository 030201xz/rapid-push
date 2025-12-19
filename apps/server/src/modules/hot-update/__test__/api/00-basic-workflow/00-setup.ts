/**
 * 基础工作流 - 步骤 00: 环境准备
 *
 * 测试内容：
 * - 系统管理员登录
 * - 获取已初始化的组织/项目/渠道
 * - 保存测试上下文供后续测试使用
 *
 * 运行: bun run src/modules/hot-update/__test__/api/00-basic-workflow/00-setup.ts
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

const logger = createTestLogger('Basic:00-Setup');

// ========== 辅助函数 ==========

/** 获取组织信息 */
async function getOrganization(
  authedClient: ReturnType<typeof createAnonymousClient>
) {
  logger.info('获取组织信息...');
  const manage = getManageApi(authedClient);
  const org = await manage.organizations.bySlug.query({
    slug: DEMO_CONFIG.organizationSlug,
  });

  if (!org) {
    throw new Error(
      `组织 ${DEMO_CONFIG.organizationSlug} 不存在，请先运行 bun run db:init`
    );
  }

  logger.info('✅ 组织', { id: org.id, name: org.name });
  return org;
}

/** 获取项目信息 */
async function getProject(
  authedClient: ReturnType<typeof createAnonymousClient>,
  organizationId: string
) {
  logger.info('获取项目信息...');
  const manage = getManageApi(authedClient);
  const project = await manage.projects.bySlug.query({
    organizationId,
    slug: DEMO_CONFIG.projectSlug,
  });

  if (!project) {
    throw new Error(`项目 ${DEMO_CONFIG.projectSlug} 不存在`);
  }

  logger.info('✅ 项目', { id: project.id, name: project.name });
  return project;
}

/** 获取渠道信息 */
async function getChannels(
  authedClient: ReturnType<typeof createAnonymousClient>,
  projectId: string
) {
  logger.info('获取渠道列表...');
  const manage = getManageApi(authedClient);
  const channels = await manage.channels.listByProject.query({
    projectId,
  });

  if (!channels || channels.length === 0) {
    throw new Error('没有可用的渠道');
  }

  const productionChannel = channels.find(
    c => c.name === 'production'
  );
  if (!productionChannel) {
    throw new Error('Production 渠道不存在');
  }

  logger.info('✅ 渠道', {
    id: productionChannel.id,
    name: productionChannel.name,
    channelKey: productionChannel.channelKey,
  });
  return productionChannel;
}

// ========== 主流程 ==========

async function main() {
  logger.info('='.repeat(50));
  logger.info('🔐 基础工作流 - 步骤 00: 环境准备');
  logger.info('='.repeat(50));

  try {
    // 清除旧的测试上下文
    await clearTestContext();

    // 1. 管理员登录
    const { accessToken, client: authedClient } = await loginAsAdmin(
      logger
    );

    // 2. 获取组织
    const org = await getOrganization(authedClient);

    // 3. 获取项目
    const project = await getProject(authedClient, org.id);

    // 4. 获取渠道
    const channel = await getChannels(authedClient, project.id);

    // 5. 保存测试上下文
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
    logger.info('下一步: bun run .../00-basic-workflow/01-upload.ts');
  } catch (error) {
    logger.error('❌ 测试失败', { error });
    process.exitCode = 1;
  }
}

main();
