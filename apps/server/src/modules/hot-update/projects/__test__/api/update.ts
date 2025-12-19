/**
 * 项目更新 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织和项目
 * 3. 调用 update 更新项目信息
 * 4. 验证更新结果正确
 * 5. 测试部分更新
 * 6. 测试更新不存在的项目
 * 7. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/projects/__test__/api/update.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ProjectUpdate' });

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
  description: '用于项目 update 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于 update 测试的项目',
};

// 更新后的数据
const UPDATED_PROJECT = {
  name: `更新后项目_${Date.now()}`,
  description: '更新后的项目描述',
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

/** 测试更新项目信息 */
async function testUpdateProject(
  accessToken: string,
  projectId: string
) {
  logger.info('测试更新项目信息...', { projectId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const updatedProject = await projectsApi.update.mutate({
    id: projectId,
    name: UPDATED_PROJECT.name,
    description: UPDATED_PROJECT.description,
  });

  if (!updatedProject) {
    throw new Error(`更新项目失败: 返回 null`);
  }

  // 验证更新结果
  if (updatedProject.name !== UPDATED_PROJECT.name) {
    throw new Error(
      `项目名称更新失败: ${updatedProject.name} !== ${UPDATED_PROJECT.name}`
    );
  }

  if (updatedProject.description !== UPDATED_PROJECT.description) {
    throw new Error(`项目描述更新失败`);
  }

  // slug 不应该改变
  if (updatedProject.slug !== TEST_PROJECT.slug) {
    throw new Error(`项目 slug 不应该被修改`);
  }

  logger.info('项目更新成功', {
    id: updatedProject.id,
    name: updatedProject.name,
    slug: updatedProject.slug,
    description: updatedProject.description,
    updatedAt: updatedProject.updatedAt,
  });

  return updatedProject;
}

/** 测试部分更新（只更新名称） */
async function testPartialUpdate(
  accessToken: string,
  projectId: string
) {
  logger.info('测试部分更新项目信息...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const partialUpdateName = `部分更新_${Date.now()}`;
  const updatedProject = await projectsApi.update.mutate({
    id: projectId,
    name: partialUpdateName,
  });

  if (!updatedProject) {
    throw new Error(`部分更新失败: 返回 null`);
  }

  // 验证名称已更新
  if (updatedProject.name !== partialUpdateName) {
    throw new Error(`部分更新名称失败`);
  }

  // 验证描述保持不变（应该是上次更新后的值）
  if (updatedProject.description !== UPDATED_PROJECT.description) {
    throw new Error(`部分更新时描述被意外修改`);
  }

  logger.info('部分更新成功', {
    id: updatedProject.id,
    name: updatedProject.name,
    description: updatedProject.description,
  });

  return updatedProject;
}

/** 测试更新不存在的项目 */
async function testUpdateNonExistentProject(accessToken: string) {
  logger.info('测试更新不存在的项目...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await projectsApi.update.mutate({
    id: nonExistentId,
    name: '测试更新不存在的项目',
  });

  if (result !== null) {
    throw new Error('更新不存在的项目应该返回 null');
  }

  logger.info('验证成功：更新不存在的项目返回 null');
}

/** 删除测试项目 */
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
  logger.info('开始 update API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
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
    testProjectId = testProject.id;

    // 4. 测试更新项目信息
    await testUpdateProject(accessToken, testProjectId);

    // 5. 测试部分更新
    await testPartialUpdate(accessToken, testProjectId);

    // 6. 测试更新不存在的项目
    await testUpdateNonExistentProject(accessToken);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (testProjectId && accessToken) {
      try {
        await deleteTestProject(accessToken, testProjectId);
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
