/**
 * 项目创建 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织（项目需要所属组织）
 * 3. 使用管理员 Token 调用 create project API
 * 4. 验证创建成功
 * 5. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/projects/__test__/api/create.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ProjectCreate' });

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 已初始化的系统管理员账户（来自 scripts/init/config）
const ADMIN_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// 待创建的测试组织（项目所属）
const TEST_ORGANIZATION = {
  name: `测试组织_${Date.now()}`,
  slug: `test-org-${Date.now()}`,
  description: '用于项目测试的组织',
};

// 待创建的测试项目
const NEW_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '这是一个测试项目',
};

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

/** 创建测试组织（准备测试数据） */
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

/** 测试创建项目 */
async function testCreateProject(
  accessToken: string,
  organizationId: string
) {
  logger.info('测试创建项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const newProject = await projectsApi.create.mutate({
    organizationId,
    name: NEW_PROJECT.name,
    slug: NEW_PROJECT.slug,
    description: NEW_PROJECT.description,
  });

  logger.info('项目创建成功', {
    id: newProject.id,
    name: newProject.name,
    slug: newProject.slug,
    organizationId: newProject.organizationId,
  });

  return newProject;
}

/** 测试查询项目（验证创建结果） */
async function testGetProject(
  accessToken: string,
  organizationId: string,
  slug: string
) {
  logger.info('测试查询项目...', { organizationId, slug });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const project = await projectsApi.bySlug.query({
    organizationId,
    slug,
  });

  if (!project) {
    throw new Error(`项目 ${slug} 不存在`);
  }

  logger.info('项目查询成功', {
    id: project.id,
    name: project.name,
    slug: project.slug,
  });

  return project;
}

/** 删除测试项目（清理测试数据） */
async function deleteTestProject(
  accessToken: string,
  projectId: string
) {
  logger.info('删除测试项目...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  await projectsApi.delete.mutate({ id: projectId });

  logger.info('项目删除成功', { projectId });
}

/** 删除测试组织（清理测试数据） */
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
  logger.info('开始项目创建 API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let newProjectId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 3. 创建新项目
    const newProject = await testCreateProject(
      accessToken,
      testOrgId
    );
    newProjectId = newProject.id;

    // 4. 查询创建的项目（验证创建成功）
    await testGetProject(accessToken, testOrgId, NEW_PROJECT.slug);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据：先删除项目，再删除组织
    if (newProjectId && accessToken) {
      try {
        await deleteTestProject(accessToken, newProjectId);
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
