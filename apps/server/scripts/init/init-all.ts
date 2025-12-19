#!/usr/bin/env bun
/**
 * 一键初始化全部数据
 *
 * 按依赖顺序插入：
 * 1. 权限 (permissions)
 * 2. 角色 (roles)
 * 3. 角色权限映射 (role_permission_mappings)
 * 4. 用户 (users)
 * 5. 用户角色映射 (user_role_mappings)
 *
 * 运行方式: bun scripts/init/init-all.ts
 */

import { permissions as permissionsTable } from '@/modules/core/access-control/permissions/schema';
import { rolePermissionMappings } from '@/modules/core/access-control/role-permission-mappings/schema';
import { roles as rolesTable } from '@/modules/core/access-control/roles/schema';
import { userRoleMappings } from '@/modules/core/access-control/user-role-mappings/schema';
import { users as usersTable } from '@/modules/core/identify/users/schema';
import { sql } from 'drizzle-orm';
import { PermissionIds, RoleIds, UserIds } from './0-env';
import {
  closeDbConnection,
  getDb,
  hashPassword,
  logger,
} from './_lib';
import { initConfig, type IdMaps } from './config';

// ============================================================================
// ID 映射表初始化
// ============================================================================

/** 创建 ID 映射表，从 0-env.ts 统一配置初始化 */
function createIdMaps(): IdMaps {
  return {
    permissions: new Map(
      Object.entries(PermissionIds) as [
        keyof typeof PermissionIds,
        string
      ][]
    ),
    roles: new Map(
      Object.entries(RoleIds) as [keyof typeof RoleIds, string][]
    ),
    users: new Map(
      Object.entries(UserIds) as [keyof typeof UserIds, string][]
    ),
  };
}

// ============================================================================
// 数据插入函数
// ============================================================================

/** 插入权限数据 */
async function insertPermissions(idMaps: IdMaps): Promise<void> {
  logger.info('创建权限...');
  const db = getDb();

  for (const permission of initConfig.permissions) {
    const { key, ...data } = permission;
    const id = idMaps.permissions.get(key);

    if (!id) {
      logger.error(`权限 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }

    // upsert: 按 code 唯一约束处理冲突
    await db
      .insert(permissionsTable)
      .values({ id, ...data })
      .onConflictDoUpdate({
        target: permissionsTable.code,
        set: {
          name: data.name,
          description: data.description,
          type: data.type,
          resource: data.resource,
          sortPriority: data.sortPriority,
          isActive: data.isActive,
          updatedAt: sql`now()`,
        },
      });

    logger.debug(`  ✓ ${data.name} (${data.code})`);
  }

  logger.info(`权限创建完成，共 ${initConfig.permissions.length} 条`);
}

/** 插入角色数据 */
async function insertRoles(idMaps: IdMaps): Promise<void> {
  logger.info('创建角色...');
  const db = getDb();

  for (const role of initConfig.roles) {
    const { key, permissionKeys, ...data } = role;
    const id = idMaps.roles.get(key);

    if (!id) {
      logger.error(`角色 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }

    // upsert: 按 code 唯一约束处理冲突
    await db
      .insert(rolesTable)
      .values({ id, ...data })
      .onConflictDoUpdate({
        target: rolesTable.code,
        set: {
          name: data.name,
          description: data.description,
          level: data.level,
          isSystem: data.isSystem,
          isActive: data.isActive,
          updatedAt: sql`now()`,
        },
      });

    logger.debug(`  ✓ ${data.name} (${data.code})`);
  }

  logger.info(`角色创建完成，共 ${initConfig.roles.length} 条`);
}

/** 插入角色权限映射数据 */
async function insertRolePermissionMappings(
  idMaps: IdMaps
): Promise<void> {
  logger.info('创建角色权限映射...');
  const db = getDb();
  let count = 0;

  for (const role of initConfig.roles) {
    const roleId = idMaps.roles.get(role.key);
    if (!roleId) continue;

    for (const permissionKey of role.permissionKeys) {
      const permissionId = idMaps.permissions.get(permissionKey);
      if (!permissionId) {
        logger.warn(`权限 ID 未找到: ${permissionKey}`);
        continue;
      }

      // 插入映射，忽略冲突
      await db
        .insert(rolePermissionMappings)
        .values({ roleId, permissionId })
        .onConflictDoNothing();

      count++;
    }

    logger.debug(
      `  ✓ ${role.name} -> ${role.permissionKeys.length} 个权限`
    );
  }

  logger.info(`角色权限映射创建完成，共 ${count} 条`);
}

/** 插入用户数据 */
async function insertUsers(idMaps: IdMaps): Promise<void> {
  logger.info('创建用户...');
  const db = getDb();

  for (const user of initConfig.users) {
    const { key, plainPassword, roleKey, ...data } = user;
    const id = idMaps.users.get(key);

    if (!id) {
      logger.error(`用户 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }

    // 密码哈希
    const passwordHash = await hashPassword(plainPassword);

    // upsert: 按 username 唯一约束处理冲突
    await db
      .insert(usersTable)
      .values({ id, passwordHash, ...data })
      .onConflictDoUpdate({
        target: usersTable.username,
        set: {
          nickname: data.nickname,
          email: data.email,
          phone: data.phone,
          passwordHash,
          status: data.status,
          isEmailVerified: data.isEmailVerified,
          isPhoneVerified: data.isPhoneVerified,
          updatedAt: sql`now()`,
        },
      });

    logger.debug(
      `  ✓ ${data.nickname ?? data.username} (${data.username})`
    );
  }

  logger.info(`用户创建完成，共 ${initConfig.users.length} 条`);
}

/** 插入用户角色映射数据 */
async function insertUserRoleMappings(idMaps: IdMaps): Promise<void> {
  logger.info('创建用户角色映射...');
  const db = getDb();
  let count = 0;

  for (const user of initConfig.users) {
    const userId = idMaps.users.get(user.key);
    const roleId = idMaps.roles.get(user.roleKey);

    if (!userId || !roleId) {
      logger.warn(
        `用户或角色 ID 未找到: user=${user.key}, role=${user.roleKey}`
      );
      continue;
    }

    // 插入映射，忽略冲突
    await db
      .insert(userRoleMappings)
      .values({ userId, roleId })
      .onConflictDoNothing();

    count++;
    logger.debug(`  ✓ ${user.username} -> ${user.roleKey}`);
  }

  logger.info(`用户角色映射创建完成，共 ${count} 条`);
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  logger.info('开始初始化数据...\n');

  const idMaps = createIdMaps();

  try {
    // 按依赖顺序插入
    await insertPermissions(idMaps);
    await insertRoles(idMaps);
    await insertRolePermissionMappings(idMaps);
    await insertUsers(idMaps);
    await insertUserRoleMappings(idMaps);

    logger.info('\n✅ 数据初始化完成！');
  } catch (error) {
    logger.error('初始化失败:', error);
    throw error;
  } finally {
    await closeDbConnection();
  }
}

// 执行主函数
main().catch(error => {
  logger.fatal('初始化脚本异常退出:', error);
  process.exit(1);
});
