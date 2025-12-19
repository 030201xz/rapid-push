#!/usr/bin/env bun
/**
 * 一键初始化全部数据
 *
 * 按依赖顺序插入：
 * 1. 权限 (permissions)
 * 2. 角色 (roles) - 包含组织角色 org:owner/admin/member
 * 3. 角色权限映射 (role_permission_mappings)
 * 4. 用户 (users)
 * 5. 用户角色映射 (user_role_mappings)
 * 6. 组织 (organizations) - hot-update
 * 7. 组织成员映射 (user_role_mappings + scope) - 为 owner 分配 org:owner
 * 8. 项目 (projects) - hot-update
 * 9. 渠道 (channels) - hot-update
 *
 * 运行方式: bun scripts/init/init-all.ts
 */

import { SCOPE_TYPE } from '@/modules/core/access-control/constants';
import { permissions as permissionsTable } from '@/modules/core/access-control/permissions/schema';
import { rolePermissionMappings } from '@/modules/core/access-control/role-permission-mappings/schema';
import { roles as rolesTable } from '@/modules/core/access-control/roles/schema';
import { userRoleMappings } from '@/modules/core/access-control/user-role-mappings/schema';
import { users as usersTable } from '@/modules/core/identify/users/schema';
import { channels as channelsTable } from '@/modules/hot-update/channels/schema';
import { organizations as organizationsTable } from '@/modules/hot-update/organizations/schema';
import { projects as projectsTable } from '@/modules/hot-update/projects/schema';
import { sql } from 'drizzle-orm';
import {
  ChannelIds,
  OrganizationIds,
  PermissionIds,
  ProjectIds,
  RoleIds,
  UserIds,
} from './0-env';
import {
  closeDbConnection,
  getDb,
  hashPassword,
  logger,
} from './_lib';
import { initConfig, type IdMaps } from './config/01-core';
import {
  hotUpdateConfig,
  type HotUpdateIdMaps,
} from './config/02-hot-update';

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

/** 创建 Hot Update ID 映射表 */
function createHotUpdateIdMaps(): HotUpdateIdMaps {
  return {
    organizations: new Map(
      Object.entries(OrganizationIds) as [
        keyof typeof OrganizationIds,
        string
      ][]
    ),
    projects: new Map(
      Object.entries(ProjectIds) as [
        keyof typeof ProjectIds,
        string
      ][]
    ),
    channels: new Map(
      Object.entries(ChannelIds) as [
        keyof typeof ChannelIds,
        string
      ][]
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
// Hot Update 数据插入函数
// ============================================================================

/** 插入组织数据并为 owner 分配组织角色 */
async function insertOrganizations(
  coreIdMaps: IdMaps,
  hotUpdateIdMaps: HotUpdateIdMaps
): Promise<void> {
  logger.info('创建组织...');
  const db = getDb();

  // 获取 org:owner 角色 ID
  const orgOwnerRoleId = coreIdMaps.roles.get('ORG_OWNER');
  if (!orgOwnerRoleId) {
    logger.error(
      'org:owner 角色 ID 未找到，请确保已在 RoleIds 中配置'
    );
    return;
  }

  for (const org of hotUpdateConfig.organizations) {
    const { key, ownerKey, ...data } = org;
    const id = hotUpdateIdMaps.organizations.get(key);
    const ownerId = coreIdMaps.users.get(ownerKey);

    if (!id) {
      logger.error(`组织 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }
    if (!ownerId) {
      logger.error(`用户 ID 未找到: ${ownerKey}`);
      continue;
    }

    // upsert: 按 slug 唯一约束处理冲突
    await db
      .insert(organizationsTable)
      .values({ id, ownerId, ...data })
      .onConflictDoUpdate({
        target: organizationsTable.slug,
        set: {
          name: data.name,
          description: data.description,
          ownerId,
          updatedAt: sql`now()`,
        },
      });

    // 为 owner 分配 org:owner 角色 (带 scope)
    await db
      .insert(userRoleMappings)
      .values({
        userId: ownerId,
        roleId: orgOwnerRoleId,
        scopeType: SCOPE_TYPE.ORGANIZATION,
        scopeId: id,
        assignReason: '组织创建时自动分配',
      })
      .onConflictDoNothing();

    logger.debug(
      `  ✓ ${data.name} (${data.slug}) - owner: ${ownerKey}`
    );
  }

  logger.info(
    `组织创建完成，共 ${hotUpdateConfig.organizations.length} 条`
  );
}

/** 插入项目数据 */
async function insertProjects(
  hotUpdateIdMaps: HotUpdateIdMaps
): Promise<void> {
  logger.info('创建项目...');
  const db = getDb();

  for (const project of hotUpdateConfig.projects) {
    const { key, organizationKey, ...data } = project;
    const id = hotUpdateIdMaps.projects.get(key);
    const organizationId =
      hotUpdateIdMaps.organizations.get(organizationKey);

    if (!id) {
      logger.error(`项目 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }
    if (!organizationId) {
      logger.error(`组织 ID 未找到: ${organizationKey}`);
      continue;
    }

    // upsert: 按 (organizationId, slug) 组合唯一约束
    await db
      .insert(projectsTable)
      .values({ id, organizationId, ...data })
      .onConflictDoUpdate({
        target: [projectsTable.organizationId, projectsTable.slug],
        set: {
          name: data.name,
          description: data.description,
          updatedAt: sql`now()`,
        },
      });

    logger.debug(`  ✓ ${data.name} (${data.slug})`);
  }

  logger.info(
    `项目创建完成，共 ${hotUpdateConfig.projects.length} 条`
  );
}

/** 插入渠道数据 */
async function insertChannels(
  hotUpdateIdMaps: HotUpdateIdMaps
): Promise<void> {
  logger.info('创建渠道...');
  const db = getDb();

  for (const channel of hotUpdateConfig.channels) {
    const { key, projectKey, presetChannelKey, ...data } = channel;
    const id = hotUpdateIdMaps.channels.get(key);
    const projectId = hotUpdateIdMaps.projects.get(projectKey);

    if (!id) {
      logger.error(`渠道 ID 未定义: ${key}，请在 0-env.ts 中配置`);
      continue;
    }
    if (!projectId) {
      logger.error(`项目 ID 未找到: ${projectKey}`);
      continue;
    }

    // 生成或使用预定义的渠道密钥
    const channelKey =
      presetChannelKey ?? `${data.name}_${id.slice(0, 8)}`;

    // upsert: 按 (projectId, name) 组合唯一约束
    await db
      .insert(channelsTable)
      .values({ id, projectId, channelKey, ...data })
      .onConflictDoUpdate({
        target: [channelsTable.projectId, channelsTable.name],
        set: {
          description: data.description,
          signingEnabled: data.signingEnabled,
          updatedAt: sql`now()`,
        },
      });

    logger.debug(`  ✓ ${data.name} (key: ${channelKey})`);
  }

  logger.info(
    `渠道创建完成，共 ${hotUpdateConfig.channels.length} 条`
  );
}

// ============================================================================
// 主函数
// ============================================================================

async function main(): Promise<void> {
  logger.info('开始初始化数据...\n');

  const idMaps = createIdMaps();
  const hotUpdateIdMaps = createHotUpdateIdMaps();

  try {
    // 按依赖顺序插入 - Core 模块
    logger.info('========== Core 模块 ==========');
    await insertPermissions(idMaps);
    await insertRoles(idMaps);
    await insertRolePermissionMappings(idMaps);
    await insertUsers(idMaps);
    await insertUserRoleMappings(idMaps);

    // 按依赖顺序插入 - Hot Update 模块
    logger.info('\n========== Hot Update 模块 ==========');
    await insertOrganizations(idMaps, hotUpdateIdMaps);
    await insertProjects(hotUpdateIdMaps);
    await insertChannels(hotUpdateIdMaps);

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
