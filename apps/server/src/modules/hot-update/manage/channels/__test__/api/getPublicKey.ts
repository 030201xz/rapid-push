/**
 * 渠道获取公钥 API 测试
 *
 * 测试流程：
 * 1. 使用已初始化的系统管理员登录获取 Token
 * 2. 创建测试组织、项目和渠道
 * 3. 测试未启用签名时获取公钥
 * 4. 设置签名密钥
 * 5. 测试获取公钥
 * 6. 验证公钥格式正确
 * 7. 测试获取不存在渠道的公钥
 * 8. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/channels/__test__/api/getPublicKey.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== Logger 实例 ==========
const logger = createLogger({
  namespace: 'Test:ChannelGetPublicKey',
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
  description: '用于渠道 getPublicKey 测试的组织',
};

// 测试项目
const TEST_PROJECT = {
  name: `测试项目_${Date.now()}`,
  slug: `test-project-${Date.now()}`,
  description: '用于渠道 getPublicKey 测试的项目',
};

// 测试渠道
const TEST_CHANNEL = {
  name: 'production',
  description: '用于 getPublicKey 测试的渠道',
};

// 测试签名密钥
const TEST_SIGNING_KEYS = {
  publicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWyRQ0JEcKwY7Zj
OT0kS8bLrHpT0L3lJYxSGVYdQK8oMsJ9Z8/2TfmUYcl5qA5Kq6JNZJ7hf3gy8T8dU3H0Z3Js4J9T
P7K8Xdy3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX
0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3
W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8xK9J0dS8J9T7K8dX0yT3W0H8
xK9J0dS8J9QIDAQAB
-----END PUBLIC KEY-----`,
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRndVLkklx2zfF+f/KBbJFDQkR
wrBjtmM5PSRLxsuselnQveUljFIZVh1ArygywnlnT/ZN+ZRhyXmoD0qrok1knuF/eDLxPx1TcfRn
cmzgn1M/srxd3LdbQfzEr0nR1Lwn1PsrxdfTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn
1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psr
x1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1Lwn1Psrx1fTJPdbQfzEr0nR1AgMBAAECggEA
TestPrivateKeyContentHereForDemoOnly0000000000000000000000000000000000000000000
-----END PRIVATE KEY-----`,
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getOrganizationsApi = (client: Client) =>
  client.hotUpdate.manage.organizations;
const getProjectsApi = (client: Client) =>
  client.hotUpdate.manage.projects;
const getChannelsApi = (client: Client) =>
  client.hotUpdate.manage.channels;

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

/** 创建测试渠道 */
async function createTestChannel(
  accessToken: string,
  projectId: string
) {
  logger.info('创建测试渠道...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const newChannel = await channelsApi.create.mutate({
    projectId,
    name: TEST_CHANNEL.name,
    description: TEST_CHANNEL.description,
  });

  logger.info('测试渠道创建成功', {
    id: newChannel.id,
    name: newChannel.name,
  });

  return newChannel;
}

/** 测试未启用签名时获取公钥 */
async function testGetPublicKeyWithoutSigning(
  accessToken: string,
  channelId: string
) {
  logger.info('测试未启用签名时获取公钥...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const publicKey = await channelsApi.getPublicKey.query({
    id: channelId,
  });

  // 未启用签名时，应该返回 null
  if (publicKey) {
    throw new Error('未启用签名时不应该有公钥');
  }

  logger.info('验证成功：未启用签名时公钥为空');
  return publicKey;
}

/** 设置签名密钥 */
async function setSigningKeys(
  accessToken: string,
  channelId: string
) {
  logger.info('设置签名密钥...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.setSigningKeys.mutate({
    id: channelId,
    publicKey: TEST_SIGNING_KEYS.publicKey,
    privateKey: TEST_SIGNING_KEYS.privateKey,
  });

  if (!result || result.signingEnabled !== true) {
    throw new Error('设置签名密钥失败');
  }

  logger.info('签名密钥设置成功');
  return result;
}

/** 测试获取公钥 */
async function testGetPublicKey(
  accessToken: string,
  channelId: string
) {
  logger.info('测试获取公钥...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const publicKey = await channelsApi.getPublicKey.query({
    id: channelId,
  });

  // 验证返回了公钥
  if (!publicKey) {
    throw new Error('获取公钥失败：未返回公钥');
  }

  logger.info('公钥获取成功', {
    publicKeyLength: publicKey.length,
  });

  return publicKey;
}

/** 验证公钥格式 */
async function verifyPublicKeyFormat(
  accessToken: string,
  channelId: string
) {
  logger.info('验证公钥格式...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const publicKey = await channelsApi.getPublicKey.query({
    id: channelId,
  });

  if (!publicKey) {
    throw new Error('获取公钥失败');
  }

  // 验证 PEM 格式
  if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
    throw new Error('公钥格式错误：缺少 BEGIN PUBLIC KEY 标记');
  }

  if (!publicKey.includes('-----END PUBLIC KEY-----')) {
    throw new Error('公钥格式错误：缺少 END PUBLIC KEY 标记');
  }

  // 验证公钥内容与设置的一致
  if (publicKey !== TEST_SIGNING_KEYS.publicKey) {
    throw new Error('获取的公钥与设置的不一致');
  }

  logger.info('公钥格式验证成功', {
    hasBeginMarker: publicKey.includes('-----BEGIN PUBLIC KEY-----'),
    hasEndMarker: publicKey.includes('-----END PUBLIC KEY-----'),
  });

  return publicKey;
}

/** 测试获取不存在渠道的公钥 */
async function testGetPublicKeyNonExistent(accessToken: string) {
  logger.info('测试获取不存在渠道的公钥...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  // 使用一个随机 UUID
  const nonExistentId = '00000000-0000-0000-0000-000000000000';
  const result = await channelsApi.getPublicKey.query({
    id: nonExistentId,
  });

  // 不存在的渠道应该返回 null
  if (result !== null) {
    throw new Error('获取不存在渠道的公钥应该返回 null');
  }

  logger.info('验证成功：不存在的渠道返回 null');
}

/** 测试公钥不会返回私钥信息 */
async function testNoPrivateKeyExposure(
  accessToken: string,
  channelId: string
) {
  logger.info('测试公钥不会返回私钥信息...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  const result = await channelsApi.getPublicKey.query({
    id: channelId,
  });

  if (!result) {
    throw new Error('获取公钥失败');
  }

  // 验证响应中不包含私钥
  const resultStr = JSON.stringify(result);

  if (resultStr.includes('PRIVATE KEY')) {
    throw new Error('安全风险：响应中包含私钥信息');
  }

  if (resultStr.includes('privateKey')) {
    throw new Error('安全风险：响应中包含私钥字段');
  }

  logger.info('验证成功：公钥响应中不包含私钥信息');
}

/** 删除测试渠道 */
async function deleteTestChannel(
  accessToken: string,
  channelId: string
) {
  logger.info('删除测试渠道...', { channelId });

  const authedClient = createClient(API_URL, { token: accessToken });
  const channelsApi = getChannelsApi(authedClient);

  await channelsApi.delete.mutate({ id: channelId });

  logger.info('渠道删除成功', { channelId });
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
  logger.info('开始 getPublicKey API 测试', { apiUrl: API_URL });

  const client = createClient(API_URL);
  let testOrgId: string | undefined;
  let testProjectId: string | undefined;
  let testChannelId: string | undefined;
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

    // 4. 创建测试渠道
    const testChannel = await createTestChannel(
      accessToken,
      testProjectId
    );
    testChannelId = testChannel.id;

    // 5. 测试未启用签名时获取公钥
    await testGetPublicKeyWithoutSigning(accessToken, testChannelId);

    // 6. 设置签名密钥
    await setSigningKeys(accessToken, testChannelId);

    // 7. 测试获取公钥
    await testGetPublicKey(accessToken, testChannelId);

    // 8. 验证公钥格式
    await verifyPublicKeyFormat(accessToken, testChannelId);

    // 9. 测试获取不存在渠道的公钥
    await testGetPublicKeyNonExistent(accessToken);

    // 10. 测试公钥不会返回私钥信息
    await testNoPrivateKeyExposure(accessToken, testChannelId);

    logger.info('所有测试通过！');
  } catch (error) {
    logger.error('测试失败', { error });
    process.exitCode = 1;
  } finally {
    // 清理测试数据（按依赖顺序逆序删除）
    if (testChannelId && accessToken) {
      try {
        await deleteTestChannel(accessToken, testChannelId);
      } catch (cleanupError) {
        logger.warn('清理测试渠道失败', { error: cleanupError });
      }
    }

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
