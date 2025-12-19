#!/usr/bin/env bun
/**
 * 清空全部初始化数据
 *
 * 按依赖顺序删除（逆序）：
 *
 * Hot Update 模块（先删除，因为依赖 Core）:
 * 1. 渠道 (channels) - 级联删除 updates, directives, rollout_rules
 * 2. 项目 (projects)
 * 3. 组织 (organizations)
 *
 * Core 模块:
 * 4. 用户角色映射 (user_role_mappings)
 * 5. 用户 (users)
 * 6. 角色权限映射 (role_permission_mappings)
 * 7. 角色 (roles)
 * 8. 权限 (permissions)
 *
 * 运行方式: bun scripts/init/clean-all.ts
 */

import { permissions as permissionsTable } from '@/modules/core/access-control/permissions/schema';
import { rolePermissionMappings } from '@/modules/core/access-control/role-permission-mappings/schema';
import { roles as rolesTable } from '@/modules/core/access-control/roles/schema';
import { userRoleMappings } from '@/modules/core/access-control/user-role-mappings/schema';
import { users as usersTable } from '@/modules/core/identify/users/schema';
import { channels as channelsTable } from '@/modules/hot-update/manage/channels/schema';
import { organizations as organizationsTable } from '@/modules/hot-update/manage/organizations/schema';
import { projects as projectsTable } from '@/modules/hot-update/manage/projects/schema';
import { inArray } from 'drizzle-orm';
import {
  ChannelIds,
  OrganizationIds,
  PermissionIds,
  ProjectIds,
  RoleIds,
  UserIds,
} from './0-env';
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
// Hot Update 数据删除函数
// ============================================================================

/** 删除渠道数据（级联删除 updates, directives 等） */
async function deleteChannels(): Promise<number> {
  const db = getDb();
  const channelIds = Object.values(ChannelIds);

  if (channelIds.length === 0) return 0;

  const result = await db
    .delete(channelsTable)
    .where(inArray(channelsTable.id, channelIds))
    .returning({ id: channelsTable.id });

  return result.length;
}

/** 删除项目数据 */
async function deleteProjects(): Promise<number> {
  const db = getDb();
  const projectIds = Object.values(ProjectIds);

  if (projectIds.length === 0) return 0;

  const result = await db
    .delete(projectsTable)
    .where(inArray(projectsTable.id, projectIds))
    .returning({ id: projectsTable.id });

  return result.length;
}

/** 删除组织数据 */
async function deleteOrganizations(): Promise<number> {
  const db = getDb();
  const organizationIds = Object.values(OrganizationIds);

  if (organizationIds.length === 0) return 0;

  const result = await db
    .delete(organizationsTable)
    .where(inArray(organizationsTable.id, organizationIds))
    .returning({ id: organizationsTable.id });

  return result.length;
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  logger.info('开始清空初始化数据...\n');

  try {
    let count: number;

    // ========== Hot Update 模块（先删除，因为有外键依赖 users） ==========
    logger.info('========== Hot Update 模块 ==========');

    logger.info('删除渠道...');
    count = await deleteChannels();
    logger.info(`  删除 ${count} 条渠道`);

    logger.info('删除项目...');
    count = await deleteProjects();
    logger.info(`  删除 ${count} 条项目`);

    logger.info('删除组织...');
    count = await deleteOrganizations();
    logger.info(`  删除 ${count} 条组织`);

    // ========== Core 模块 ==========
    logger.info('\n========== Core 模块 ==========');

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
