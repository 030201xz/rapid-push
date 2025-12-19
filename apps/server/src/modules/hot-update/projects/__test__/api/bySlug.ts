/**
 * 项目详情（根据组织和 Slug）API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织和项目
 * 3. 调用 bySlug 根据组织 ID 和 slug 获取项目详情
 * 4. 验证返回结果正确
 * 5. 测试查询不存在的项目
 * 6. 通过 API 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/projects/__test__/api/bySlug.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({ namespace: 'Test:ProjectBySlug' });

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
  description: '用于项目 bySlug 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于 bySlug 测试的项目',
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
    slug: newProject.slug,
  });

  return newProject;
}

/** 测试根据组织 ID 和 slug 获取项目详情 */
async function testGetProjectBySlug(
  accessToken: string,
  organizationId: string,
  slug: string,
  expectedProjectId: string
) {
  logger.info('测试根据组织 ID 和 slug 获取项目详情...', {
    organizationId,
    slug,
  });

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  const project = await projectsApi.bySlug.query({
    organizationId,
    slug,
  });

  if (!project) {
    throw new Error(`项目 ${slug} 不存在`);
  }

  // 验证返回数据正确
  if (project.id !== expectedProjectId) {
    throw new Error(
      `返回的项目 ID 不匹配: ${project.id} !== ${expectedProjectId}`
    );
  }

  if (project.slug !== slug) {
    throw new Error(`返回的项目 slug 不匹配`);
  }

  if (project.organizationId !== organizationId) {
    throw new Error(`返回的组织 ID 不匹配`);
  }

  if (project.name !== TEST_PROJECT.name) {
    throw new Error(`返回的项目名称不匹配`);
  }

  logger.info('项目详情获取成功', {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    organizationId: project.organizationId,
    createdAt: project.createdAt,
  });

  return project;
}

/** 测试查询不存在的项目（通过 slug） */
async function testGetNonExistentProjectBySlug(
  accessToken: string,
  organizationId: string
) {
  logger.info('测试查询不存在的项目（通过 slug）...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const projectsApi = getProjectsApi(authedClient);

  // 使用一个随机不存在的 slug
  const nonExistentSlug = `non-existent-project-${Date.now()}-${Math.random()}`;
  const project = await projectsApi.bySlug.query({
    organizationId,
    slug: nonExistentSlug,
  });

  if (project !== null) {
    throw new Error('查询不存在的项目应该返回 null');
  }

  logger.info('验证成功：查询不存在的项目返回 null');
}

/** 测试在不同组织下使用相同 slug */
async function testSameSlugDifferentOrganization(
  accessToken: string,
  originalOrgId: string,
  originalProjectId: string
) {
  logger.info('测试在不同组织下使用相同 slug...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const organizationsApi = getOrganizationsApi(authedClient);
  const projectsApi = getProjectsApi(authedClient);

  // 创建第二个组织
  const secondOrg = await organizationsApi.create.mutate({
    name: `第二个组织_${Date.now()}`,
    slug: `second-org-${Date.now()}`,
    description: '用于测试 slug 唯一性的第二个组织',
  });

  try {
    // 在第二个组织中创建相同 slug 的项目（应该成功）
    const secondProject = await projectsApi.create.mutate({
      organizationId: secondOrg.id,
      name: `第二个项目_${Date.now()}`,
      slug: TEST_PROJECT.slug, // 使用相同的 slug
      description: '不同组织下的同名项目',
    });

    // 验证在第一个组织下查询返回原项目
    const project1 = await projectsApi.bySlug.query({
      organizationId: originalOrgId,
      slug: TEST_PROJECT.slug,
    });

    if (project1?.id !== originalProjectId) {
      throw new Error('第一个组织下应该返回原项目');
    }

    // 验证在第二个组织下查询返回新项目
    const project2 = await projectsApi.bySlug.query({
      organizationId: secondOrg.id,
      slug: TEST_PROJECT.slug,
    });

    if (project2?.id !== secondProject.id) {
      throw new Error('第二个组织下应该返回新项目');
    }

    logger.info('验证成功：不同组织下可以有相同 slug 的项目');

    // 清理第二个项目
    await projectsApi.delete.mutate({ id: secondProject.id });
  } finally {
    // 清理第二个组织
    await organizationsApi.delete.mutate({ id: secondOrg.id });
  }
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
  logger.info('开始 bySlug API 测试', { apiUrl: API_URL });

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

    // 4. 测试根据组织 ID 和 slug 获取项目详情
    await testGetProjectBySlug(
      accessToken,
      testOrgId,
      TEST_PROJECT.slug,
      testProjectId
    );

    // 5. 测试查询不存在的项目
    await testGetNonExistentProjectBySlug(accessToken, testOrgId);

    // 6. 测试在不同组织下使用相同 slug
    await testSameSlugDifferentOrganization(
      accessToken,
      testOrgId,
      testProjectId
    );

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
