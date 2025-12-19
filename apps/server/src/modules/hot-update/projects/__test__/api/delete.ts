/**
 * 项目删除 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织和项目
 * 3. 验证项目存在
 * 4. 调用 delete 删除项目（软删除）
 * 5. 验证删除后项目不可查询
 * 6. 测试删除不存在的项目
 * 7. 清理测试组织
 *
 * 运行: bun run src/modules/hot-update/projects/__test__/api/delete.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ProjectDelete' });

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
  description: '用于项目 delete 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于 delete 测试的项目',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.organizations;
const getProjectsApi = (client: Client) => client.hotUpdate.projects;

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
async function createTestProject(
  accessToken: string,
  organizationId: string
) {
  logger.info('创建测试项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const newProject = await projectsApi.create.mutate({
    organizationId,
    name: TEST_PROJECT.name,
    slug: TEST_PROJECT.slug,
    description: TEST_PROJECT.description,
  });

  logger.info('测试项目创建成功', {
    id: newProject.id,
    name: newProject.name,
  });

  return newProject;
}

/** 验证项目存在 */
async function verifyProjectExists(
  accessToken: string,
  projectId: string
) {
  logger.info('验证项目存在...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const project = await projectsApi.byId.query({ id: projectId });

  if (!project) {
    throw new Error(`项目 ${projectId} 应该存在`);
  }

  logger.info('项目存在性验证成功');
  return project;
}

/** 测试删除项目 */
async function testDeleteProject(
  accessToken: string,
  projectId: string
) {
  logger.info('测试删除项目...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const result = await projectsApi.delete.mutate({ id: projectId });

  // 验证删除成功（软删除应返回 true）
  if (result !== true) {
    throw new Error(`删除项目失败: 返回 ${result}`);
  }

  logger.info('项目删除成功', { projectId, result });

  return result;
}

/** 验证项目已被删除（不可查询） */
async function verifyProjectDeleted(
  accessToken: string,
  projectId: string
) {
  logger.info('验证项目已被删除...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const project = await projectsApi.byId.query({ id: projectId });

  // 软删除后，通过 byId 应该查询不到
  if (project !== null) {
    throw new Error(`已删除的项目不应该被查询到`);
  }

  logger.info('验证成功：删除后项目不可查询');
}

/** 验证项目不在组织列表中 */
async function verifyProjectNotInList(
  accessToken: string,
  organizationId: string,
  projectId: string
) {
  logger.info('验证项目不在组织列表中...', {
    organizationId,
    projectId,
  });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const projects = await projectsApi.listByOrganization.query({
    organizationId,
  });

  const foundProject = projects.find(p => p.id === projectId);
  if (foundProject) {
    throw new Error(`已删除的项目不应该出现在组织列表中`);
  }

  logger.info('验证成功：删除后项目不在组织列表中');
}

/** 测试删除不存在的项目 */
async function testDeleteNonExistentProject(accessToken: string) {
  logger.info('测试删除不存在的项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await projectsApi.delete.mutate({
    id: nonExistentId,
  });

  // 删除不存在的项目应该返回 false
  if (result !== false) {
    throw new Error(
      `删除不存在的项目应该返回 false，实际返回 ${result}`
    );
  }

  logger.info('验证成功：删除不存在的项目返回 false');
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
  logger.info('开始 delete API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let accessToken: string | undefined;

  try {
    // 1. 管理员登录
    const loginResult = await testAdminLogin(client);
    accessToken = loginResult.accessToken;

    // 2. 创建测试组织
    const testOrg = await createTestOrganization(accessToken);
    testOrgId = testOrg.id;

    // 3. 创建测试项目
    const testProject = await createTestProject(
      accessToken,
      testOrgId
    );
    const testProjectId = testProject.id;

    // 4. 验证项目存在
    await verifyProjectExists(accessToken, testProjectId);

    // 5. 测试删除项目
    await testDeleteProject(accessToken, testProjectId);

    // 6. 验证删除后项目不可查询
    await verifyProjectDeleted(accessToken, testProjectId);

    // 7. 验证项目不在组织列表中
    await verifyProjectNotInList(
      accessToken,
      testOrgId,
      testProjectId
    );

    // 8. 测试删除不存在的项目
    await testDeleteNonExistentProject(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试组织（项目已被删除）
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
