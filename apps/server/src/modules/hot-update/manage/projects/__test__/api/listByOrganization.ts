/**
 * 项目列表（按组织）API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织
 * 3. 在组织下创建多个测试项目
 * 4. 调用 listByOrganization 获取组织下的项目列表
 * 5. 验证返回结果包含创建的项目
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/projects/__test__/api/listByOrganization.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:ProjectListByOrganization',
});

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 测试组织
const TEST_ORGANIZATION = {
  name: `测试组织_${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: '用于项目列表测试的组织',
};

// 测试项目列表
const TEST_PROJECTS = [
  {
    name: `测试项目A_${Date.now()}`,
    slug: `test-project-a-${Date.now()}`,
    description: '测试项目 A',
  },
  {
    name: `测试项目B_${Date.now()}`,
    slug: `test-project-b-${Date.now()}`,
    description: '测试项目 B',
  },
];

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.manage.organizations;
const getProjectsApi = (client: Client) =>
  client.hotUpdate.manage.projects;

// ========== 测试用例 ==========

/** 测试管理员登录 */
async function testAdminLogin(client: Client) {
  logger.info('测试管理员登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logger.info('管理员登录成功', { user: result.user?.username });

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
  };
}

/** 创建测试组织 */
async function createTestOrganization(accessToken: string) {
  logger.info('创建测试组织...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  const newOrg = await organizationsApi.create.mutate({
    name: TEST_ORGANIZATION.name,
    slug: TEST_ORGANIZATION.slug,
    description: TEST_ORGANIZATION.description,
  });

  logger.info('测试组织创建成功', {
    id: newOrg.id,
    name: newOrg.name,
  });

  return newOrg;
}

/** 创建测试项目 */
async function createTestProjects(
  accessToken: string,
  organizationId: string
) {
  logger.info('创建测试项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const createdProjects = [];
  for (const project of TEST_PROJECTS) {
    const newProject = await projectsApi.create.mutate({
      organizationId,
      name: project.name,
      slug: project.slug,
      description: project.description,
    });
    createdProjects.push(newProject);
    logger.info('测试项目创建成功', {
      id: newProject.id,
      name: newProject.name,
    });
  }

  return createdProjects;
}

/** 测试获取组织下的项目列表 */
async function testListByOrganization(
  accessToken: string,
  organizationId: string,
  expectedProjectIds: string[]
) {
  logger.info('测试获取组织下的项目列表...', { organizationId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const projects = await projectsApi.listByOrganization.query({
    organizationId,
  });

  logger.info('获取项目列表成功', {
    count: projects.length,
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
    })),
  });

  // 验证返回结果包含所有创建的项目
  for (const expectedId of expectedProjectIds) {
    const foundProject = projects.find(p => p.id === expectedId);
    if (!foundProject) {
      throw new Error(`项目列表中未找到项目 ${expectedId}`);
    }
  }

  logger.info('验证成功：项目列表包含所有创建的项目');

  return projects;
}

/** 测试获取空组织的项目列表 */
async function testListEmptyOrganization(
  accessToken: string,
  organizationId: string
) {
  logger.info('测试获取空组织的项目列表...', { organizationId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);
  const projectsApi = getProjectsApi(authedClient);

  // 创建一个新的空组织
  const emptyOrg = await organizationsApi.create.mutate({
    name: `空组织_${Date.now()}`,
    slug: `empty-org-${Date.now()}`,
    description: '用于测试空列表的组织',
  });

  try {
    const projects = await projectsApi.listByOrganization.query({
      organizationId: emptyOrg.id,
    });

    if (projects.length !== 0) {
      throw new Error('空组织应该返回空项目列表');
    }

    logger.info('验证成功：空组织返回空项目列表');
  } finally {
    // 清理空组织
    await organizationsApi.delete.mutate({ id: emptyOrg.id });
  }
}

/** 删除测试项目 */
async function deleteTestProjects(
  accessToken: string,
  projectIds: string[]
) {
  logger.info('删除测试项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  for (const projectId of projectIds) {
    await projectsApi.delete.mutate({ id: projectId });
    logger.info('项目删除成功', { projectId });
  }
}

/** 删除测试组织 */
async function deleteTestOrganization(
  accessToken: string,
  orgId: string
) {
  logger.info('删除测试组织...', { orgId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);

  await organizationsApi.delete.mutate({ id: orgId });

  logger.info('组织删除成功', { orgId });
}

// ========== 主测试流程 ==========

async function main() {
  logger.info('开始 listByOrganization API 测试', {
    apiUrl: API_URL,
  });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectIds: string[] = [];
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 3. 创建测试项目
    const testProjects = await createTestProjects(
      accessToken,
      testOrgId
    );
    testProjectIds = testProjects.map(p => p.id);

    // 4. 测试获取组织下的项目列表
    await testListByOrganization(
      accessToken,
      testOrgId,
      testProjectIds
    );

    // 5. 测试获取空组织的项目列表
    await testListEmptyOrganization(accessToken, testOrgId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testProjectIds.length > 0 && accessToken) {
      try {
        await deleteTestProjects(accessToken, testProjectIds);
      } catch (cleanupError) {
        logger.warn('清理测试项目失败', { error: cleanupError });
      }
    }

    if (testOrgId && accessToken) {
      try {
        await deleteTestOrganization(accessToken, testOrgId);
      } catch (cleanupError) {
        logger.warn('清理测试组织失败', { error: cleanupError });
      }
    }
  }
}

// 运行测试
main();
