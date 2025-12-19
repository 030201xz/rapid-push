#!/usr/bin/env bun
/**
 * 清空全部初始化数据
 *
 * 按依赖顺序删除（逆序）：
 * 1. 用户角色映射 (user_role_mappings)
 * 2. 用户 (users)
 * 3. 角色权限映射 (role_permission_mappings)
 * 4. 角色 (roles)
 * 5. 权限 (permissions)
 *
 * 运行方式: bun scripts/init/clean-all.ts
 */

import { permissions as permissionsTable } from '@/modules/core/access-control/permissions/schema';
import { rolePermissionMappings } from '@/modules/core/access-control/role-permission-mappings/schema';
import { roles as rolesTable } from '@/modules/core/access-control/roles/schema';
import { userRoleMappings } from '@/modules/core/access-control/user-role-mappings/schema';
import { users as usersTable } from '@/modules/core/identify/users/schema';
import { inArray } from 'drizzle-orm';
import { PermissionIds, RoleIds, UserIds } from './0-env';
import { closeDbConnection, getDb, logger } from './_lib';

// ============================================================================
// 数据删除函数
// ============================================================================

/** 删除用户角色映射数据 */
async function deleteUserRoleMappings(): Promise<number> {
  const db = getDb();
  const userIds = Object.values(UserIds);

  if (userIds.length === 0) return 0;

  const result = await db
    .delete(userRoleMappings)
    .where(inArray(userRoleMappings.userId, userIds))
    .returning({ id: userRoleMappings.id });

  return result.length;
}

/** 删除用户数据 */
async function deleteUsers(): Promise<number> {
  const db = getDb();
  const userIds = Object.values(UserIds);

  if (userIds.length === 0) return 0;

  const result = await db
    .delete(usersTable)
    .where(inArray(usersTable.id, userIds))
    .returning({ id: usersTable.id });

  return result.length;
}

/** 删除角色权限映射数据 */
async function deleteRolePermissionMappings(): Promise<number> {
  const db = getDb();
  const roleIds = Object.values(RoleIds);

  if (roleIds.length === 0) return 0;

  const result = await db
    .delete(rolePermissionMappings)
    .where(inArray(rolePermissionMappings.roleId, roleIds))
    .returning({ id: rolePermissionMappings.id });

  return result.length;
}

/** 删除角色数据 */
async function deleteRoles(): Promise<number> {
  const db = getDb();
  const roleIds = Object.values(RoleIds);

  if (roleIds.length === 0) return 0;

  const result = await db
    .delete(rolesTable)
    .where(inArray(rolesTable.id, roleIds))
    .returning({ id: rolesTable.id });

  return result.length;
}

/** 删除权限数据 */
async function deletePermissions(): Promise<number> {
  const db = getDb();
  const permissionIds = Object.values(PermissionIds);

  if (permissionIds.length === 0) return 0;

  const result = await db
    .delete(permissionsTable)
    .where(inArray(permissionsTable.id, permissionIds))
    .returning({ id: permissionsTable.id });

  return result.length;
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  logger.info('开始清空初始化数据...\n');

  try {
    // 按依赖逆序删除
    let count: number;

    logger.info('删除用户角色映射...');
    count = await deleteUserRoleMappings();
    logger.info(`  删除 ${count} 条用户角色映射`);

    logger.info('删除用户...');
    count = await deleteUsers();
    logger.info(`  删除 ${count} 条用户`);

    logger.info('删除角色权限映射...');
    count = await deleteRolePermissionMappings();
    logger.info(`  删除 ${count} 条角色权限映射`);

    logger.info('删除角色...');
    count = await deleteRoles();
    logger.info(`  删除 ${count} 条角色`);

    logger.info('删除权限...');
    count = await deletePermissions();
    logger.info(`  删除 ${count} 条权限`);

    logger.info('\n✅ 数据清空完成！');
  } catch (error) {
    logger.error('清空失败:', error);
    throw error;
  } finally {
    await closeDbConnection();
  }
}

// 执行主函数
main().catch(error => {
  logger.fatal('清空脚本异常退出:', error);
  process.exit(1);
});
