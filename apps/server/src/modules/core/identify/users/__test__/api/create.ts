/**
 * 用户创建 API 测试
 *
 * 测试流程：
 * 1. 直接通过 DB 创建管理员用户（绕过 API 权限限制）
 * 2. 使用管理员登录获取 Token
 * 3. 使用管理员 Token 调用 create user API
 * 4. 验证创建成功
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/core/identify/users/__test__/api/create.ts
 */

import {
  getDb,
  getGlobalClient,
} from '@/common/database/postgresql/rapid-s';
import { env } from '@/common/env';
import { createClient, type Client } from '@client/index';
import { eq } from 'drizzle-orm';
import { roles } from '../../../../access-control/roles/schema';
import { userRoleMappings } from '../../../../access-control/user-role-mappings/schema';
import { users } from '../../schema';

// ========== 测试配置 ==========

const API_URL = `http://${env.host}:${env.port}/trpc`;

// 测试管理员账户（需通过 DB 直接创建）
const ADMIN_USER = {
  username: `admin888`,
  password: 'AdminPassword123!',
  email: `admin888@admin888.com`,
};

// 待创建的测试用户
const NEW_USER = {
  username: `test_user`,
  passwordHash: '', // 将在运行时生成
  email: `test_user@test.com`,
  nickname: '测试用户',
};

// ========== 路由别名 ==========

const getAuthApi = (client: Client) => client.core.identify.auth;
const getUsersApi = (client: Client) => client.core.identify.users;

// ========== 测试辅助函数 ==========

function logResult(title: string, data: unknown): void {
  console.log(`\n========== ${title} ==========`);
  console.log(JSON.stringify(data, null, 2));
}

/** 生成密码哈希 */
async function hashPassword(plain: string): Promise<string> {
  return Bun.password.hash(plain);
}

// ========== 数据库操作 ==========

/** 直接通过 DB 创建管理员用户 */
async function createAdminUser() {
  console.log('\n📦 通过 DB 创建管理员用户...');

  const db = getDb();

  // 1. 创建用户
  const passwordHash = await hashPassword(ADMIN_USER.password);
  const [adminUser] = await db
    .insert(users)
    .values({
      username: ADMIN_USER.username,
      passwordHash,
      email: ADMIN_USER.email,
      nickname: '测试管理员',
      status: 'active', // 直接激活
    })
    .returning();

  if (!adminUser) {
    throw new Error('创建管理员用户失败');
  }

  console.log(
    `✅ 创建管理员用户: ${adminUser.username} (${adminUser.id})`
  );

  // 2. 查找或创建 admin 角色
  let adminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.code, 'admin'))
    .then(rows => rows[0]);

  if (!adminRole) {
    console.log('⚠️ admin 角色不存在，正在创建...');
    const [newRole] = await db
      .insert(roles)
      .values({
        code: 'admin',
        name: '管理员',
        description: '系统管理员',
      })
      .returning();
    adminRole = newRole;
  }

  if (!adminRole) {
    throw new Error('admin 角色创建失败');
  }

  // 3. 分配 admin 角色
  await db.insert(userRoleMappings).values({
    userId: adminUser.id,
    roleId: adminRole.id,
  });

  console.log(`✅ 已分配 admin 角色`);

  return adminUser;
}

/** 清理测试数据 */
async function cleanupTestData(
  adminUserId: string,
  newUserId?: string
) {
  console.log('\n🧹 清理测试数据...');

  const db = getDb();

  // 删除用户角色映射
  await db
    .delete(userRoleMappings)
    .where(eq(userRoleMappings.userId, adminUserId));
  if (newUserId) {
    await db
      .delete(userRoleMappings)
      .where(eq(userRoleMappings.userId, newUserId));
  }

  // 删除用户
  await db.delete(users).where(eq(users.id, adminUserId));
  if (newUserId) {
    await db.delete(users).where(eq(users.id, newUserId));
  }

  console.log('✅ 测试数据已清理');
}

// ========== 测试用例 ==========

/** 测试管理员登录 */
async function testAdminLogin(client: Client) {
  console.log('\n🔐 测试管理员登录...');

  const auth = getAuthApi(client);
  const result = await auth.login.mutate({
    username: ADMIN_USER.username,
    password: ADMIN_USER.password,
  });

  if (!result.success) {
    throw new Error(`管理员登录失败: ${result.errorMessage}`);
  }

  logResult('登录结果', {
    success: true,
    user: result.user?.username,
  });
  console.log('✅ 管理员登录成功');

  return {
    accessToken: result.accessToken!,
    refreshToken: result.refreshToken!,
  };
}

/** 测试创建用户 */
async function testCreateUser(accessToken: string) {
  console.log('\n👤 测试创建用户...');

  const authedClient = createClient(API_URL, { token: accessToken });
  const usersApi = getUsersApi(authedClient);

  // 生成密码哈希
  const passwordHash = await hashPassword('UserPassword123!');

  const newUser = await usersApi.create.mutate({
    username: NEW_USER.username,
    passwordHash,
    email: NEW_USER.email,
    nickname: NEW_USER.nickname,
  });

  logResult('创建的用户', {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    status: newUser.status,
  });

  console.log(`✅ 用户创建成功: ${newUser.username}`);

  return newUser;
}

/** 测试查询用户 */
async function testGetUser(client: Client, username: string) {
  console.log('\n🔍 测试查询用户...');

  const usersApi = getUsersApi(client);
  const user = await usersApi.byUsername.query({ username });

  if (!user) {
    throw new Error(`用户 ${username} 不存在`);
  }

  logResult('查询结果', {
    id: user.id,
    username: user.username,
    email: user.email,
  });

  console.log('✅ 用户查询成功');

  return user;
}

/** 测试用户列表 */
async function testListUsers(client: Client) {
  console.log('\n📋 测试用户列表...');

  const usersApi = getUsersApi(client);
  const userList = await usersApi.list.query();

  console.log(`✅ 获取到 ${userList.length} 个用户`);

  return userList;
}

// ========== 主测试流程 ==========

async function main() {
  console.log('🚀 开始用户创建 API 测试');
  console.log(`📍 API 地址: ${API_URL}`);

  const client = createClient(API_URL);
  let adminUser: { id: string } | null = null;
  let newUserId: string | undefined;

  try {
    // 1. 通过 DB 创建管理员用户
    adminUser = await createAdminUser();

    // 2. 管理员登录
    const { accessToken } = await testAdminLogin(client);

    // 3. 创建新用户
    const newUser = await testCreateUser(accessToken);
    newUserId = newUser.id;

    // 4. 查询创建的用户
    await testGetUser(client, NEW_USER.username);

    // 5. 获取用户列表
    await testListUsers(client);

    console.log('\n🎉 所有测试通过！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exitCode = 1;
  } finally {
    // 清理测试数据
    if (adminUser) {
      await cleanupTestData(adminUser.id, newUserId);
    }
    // 关闭数据库连接，确保进程正常退出
    await getGlobalClient().close();
  }
}

// 运行测试
main();
