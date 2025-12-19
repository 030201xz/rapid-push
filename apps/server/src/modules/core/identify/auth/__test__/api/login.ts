/**
 * 登录 API 测试
 *
 * 使用 tRPC 客户端测试登录、刷新 Token、登出等流程
 *
 * 运行: bun run src/modules/core/identify/auth/__test__/api/login.ts
 */

import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';

// ========== 测试配置 ==========
const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试用户凭证（需要在数据库中存在）
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456',
};

// ========== 路由别名 ==========

/** 获取 auth 路由（简化路径访问） */
const getAuthApi = (client: Client) => client.core.identify.auth;

// ========== 测试辅助函数 ==========

/** 格式化输出结果 */
function logResult(title: string, data: unknown): void {
  console.log(`\n========== ${title} ==========`);
  console.log(JSON.stringify(data, null, 2));
}

/** 断言成功 */
function assertSuccess(
  result: { success: boolean },
  message: string
): void {
  if (!result.success) {
    throw new Error(`断言失败: ${message}`);
  }
  console.log(`✅ ${message}`);
}

// ========== 测试用例 ==========

/** 测试登录流程 */
async function testLogin(client: Client) {
  console.log('\n🔐 测试登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: TEST_USER.username,
    password: TEST_USER.password,
  });

  logResult('登录结果', result);

  if (!result.success) {
    throw new Error(`登录失败: ${result.errorMessage}`);
  }

  assertSuccess(result, '登录成功');

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
  };
}

/** 测试获取当前用户信息 */
async function testMe(accessToken: string) {
  console.log('\n👤 测试获取当前用户...');

  // 创建带 Token 的客户端
  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const user = await auth.me.query();

  logResult('当前用户', user);
  console.log(`✅ 获取用户信息成功: ${user.username}`);

  return user;
}

/** 测试刷新 Token */
async function testRefresh(client: Client, refreshToken: string) {
  console.log('\n🔄 测试刷新 Token...');

  const auth = getAuthApi(client);
  const result = await auth.refresh.mutate({
    refreshToken,
  });

  logResult('刷新结果', result);

  if (!result.success) {
    throw new Error(`刷新失败: ${result.errorMessage}`);
  }

  assertSuccess(result, '刷新 Token 成功');

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
}

/** 测试登出 */
async function testLogout(accessToken: string) {
  console.log('\n🚪 测试登出...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);
  const result = await auth.logout.mutate();

  logResult('登出结果', result);

  if (!result.success) {
    throw new Error('登出失败');
  }

  console.log('✅ 登出成功');

  return result;
}

/** 测试登出后 Token 失效 */
async function testTokenInvalidAfterLogout(accessToken: string) {
  console.log('\n🔒 测试登出后 Token 失效...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const auth = getAuthApi(authedClient);

  try {
    await auth.me.query();
    throw new Error('预期请求应该失败，但成功了');
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('预期请求应该失败')
    ) {
      throw error;
    }
    console.log('✅ Token 已失效，请求被拒绝');
  }
}

// ========== 主测试流程 ==========

async function main() {
  console.log('🚀 开始登录 API 测试');
  console.log(`📍 API 地址: ${API_URL}`);

  // 创建公开客户端
  const client = createClient(API_URL);

  try {
    // 1. 登录测试
    const loginResult = await testLogin(client);

    // 2. 获取当前用户测试
    await testMe(loginResult.accessToken!);

    // 3. 刷新 Token 测试
    const refreshResult = await testRefresh(
      client,
      loginResult.refreshToken!
    );

    // 4. 使用新 Token 获取用户信息
    await testMe(refreshResult.accessToken!);

    // 5. 登出测试
    await testLogout(refreshResult.accessToken!);

    // 6. 验证 Token 失效
    await testTokenInvalidAfterLogout(refreshResult.accessToken!);

    console.log('\n🎉 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();
