/**
 * 测试共享配置和工具函数
 *
 * 为所有渐进式测试提供统一的配置和辅助函数
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { createLogger } from '@rapid-s/logger';

// ========== 常量配置 ==========

/** API 基础地址 */
export const API_URL = `http://${env.host}:${env.port}/trpc`;

/** 系统管理员账户 */
export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'Admin@123456',
} as const;

/** 预置的演示数据配置 */
export const DEMO_CONFIG = {
  organizationSlug: 'demo',
  projectSlug: 'demo-app',
  productionChannelKey: 'prod_demo_app_channel_key_12345678',
  stagingChannelKey: 'stage_demo_app_channel_key_87654321',
} as const;

// ========== 路由别名类型 ==========

/** 获取认证 API */
export const getAuthApi = (client: Client) =>
  client.core.identify.auth;

/** 获取热更新管理 API */
export const getManageApi = (client: Client) =>
  client.hotUpdate.manage;

/** 获取协议 API */
export const getProtocolApi = (client: Client) =>
  client.hotUpdate.protocol;

/** 获取存储 API */
export const getStorageApi = (client: Client) =>
  client.hotUpdate.storage;

/** 获取指标 API */
export const getMetricsApi = (client: Client) =>
  client.hotUpdate.metrics;

// ========== 工厂函数 ==========

/** 创建测试 Logger */
export function createTestLogger(namespace: string) {
  return createLogger({ namespace: `Test:HotUpdate:${namespace}` });
}

/** 创建匿名客户端 */
export function createAnonymousClient() {
  return createClient(API_URL);
}

/** 管理员登录并返回已认证的客户端 */
export async function loginAsAdmin(
  logger: ReturnType<typeof createTestLogger>
) {
  logger.info('管理员登录...');
  const client = createAnonymousClient();
  const auth = getAuthApi(client);

  const result = await auth.login.mutate({
    username: ADMIN_CREDENTIALS.username,
    password: ADMIN_CREDENTIALS.password,
  });

  if (!result.success) {
    const errorMsg =
      'errorMessage' in result ? result.errorMessage : '未知错误';
    throw new Error(`登录失败: ${errorMsg}`);
  }

  if (!result.accessToken) {
    throw new Error('登录失败: 未获取到访问令牌');
  }

  logger.info('✅ 登录成功', { user: result.user?.username });

  return {
    accessToken: result.accessToken,
    client: createClient(API_URL, { token: result.accessToken }),
    user: result.user,
  };
}

// ========== 测试结果存储 ==========

/** 测试上下文接口（跨测试共享数据） */
export interface TestContext {
  accessToken: string;
  organizationId: string;
  projectId: string;
  channelId: string;
  channelKey: string;
  updateIds: string[];
  ruleIds: string[];
  /** 指令场景使用 */
  directiveId: string;
  /** 签名场景使用 */
  publicKey: string;
  privateKey: string;
  /** 端到端测试使用 */
  testUpdateId: string;
}

/** 测试上下文文件路径 */
const CONTEXT_FILE = '/tmp/rapid-s-test-context.json';

/** 保存测试上下文 */
export async function saveTestContext(ctx: Partial<TestContext>) {
  const existing = await loadTestContext();
  const merged = { ...existing, ...ctx };
  await Bun.write(CONTEXT_FILE, JSON.stringify(merged, null, 2));
}

/** 加载测试上下文 */
export async function loadTestContext(): Promise<
  Partial<TestContext>
> {
  try {
    const file = Bun.file(CONTEXT_FILE);
    if (await file.exists()) {
      return JSON.parse(await file.text()) as Partial<TestContext>;
    }
  } catch {
    // 文件不存在或解析失败，返回空对象
  }
  return {};
}

/** 清除测试上下文 */
export async function clearTestContext() {
  try {
    const file = Bun.file(CONTEXT_FILE);
    if (await file.exists()) {
      await Bun.write(CONTEXT_FILE, '{}');
    }
  } catch {
    // 忽略错误
  }
}

// ========== 重导出 ==========

export { createClient, type Client };
