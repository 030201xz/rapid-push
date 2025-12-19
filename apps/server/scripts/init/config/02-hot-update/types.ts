/**
 * Hot Update 初始化配置类型定义
 *
 * 复用 Drizzle Schema 导出的插入类型，确保类型安全
 */

import type { NewChannel } from '@/modules/hot-update/channels/schema';
import type { NewOrganization } from '@/modules/hot-update/organizations/schema';
import type { NewProject } from '@/modules/hot-update/projects/schema';
import type {
  ChannelKey,
  OrganizationKey,
  ProjectKey,
  UserKey,
} from '../../0-env';

// ============================================================================
// 组织配置
// ============================================================================

/** 组织配置 - 基于 NewOrganization 类型 */
export interface OrganizationConfig
  extends Omit<
    NewOrganization,
    'id' | 'ownerId' | 'createdAt' | 'updatedAt'
  > {
  /** 配置唯一标识 */
  key: OrganizationKey;
  /** 所有者用户 key（引用 UserIds） */
  ownerKey: UserKey;
}

// ============================================================================
// 项目配置
// ============================================================================

/** 项目配置 - 基于 NewProject 类型 */
export interface ProjectConfig
  extends Omit<
    NewProject,
    'id' | 'organizationId' | 'createdAt' | 'updatedAt'
  > {
  /** 配置唯一标识 */
  key: ProjectKey;
  /** 所属组织 key（引用 OrganizationIds） */
  organizationKey: OrganizationKey;
}

// ============================================================================
// 渠道配置
// ============================================================================

/** 渠道配置 - 基于 NewChannel 类型 */
export interface ChannelConfig
  extends Omit<
    NewChannel,
    | 'id'
    | 'projectId'
    | 'channelKey'
    | 'privateKey'
    | 'publicKey'
    | 'createdAt'
    | 'updatedAt'
  > {
  /** 配置唯一标识 */
  key: ChannelKey;
  /** 所属项目 key（引用 ProjectIds） */
  projectKey: ProjectKey;
  /** 预定义的渠道密钥（可选，不指定则自动生成） */
  presetChannelKey?: string;
}

// ============================================================================
// 全量配置汇总
// ============================================================================

/** Hot Update 初始化配置汇总 */
export interface HotUpdateInitConfig {
  /** 组织配置列表 */
  organizations: OrganizationConfig[];
  /** 项目配置列表 */
  projects: ProjectConfig[];
  /** 渠道配置列表 */
  channels: ChannelConfig[];
}

// ============================================================================
// ID 映射表类型
// ============================================================================

/** Hot Update ID 映射表 */
export interface HotUpdateIdMaps {
  /** 组织 ID 映射 */
  organizations: Map<OrganizationKey, string>;
  /** 项目 ID 映射 */
  projects: Map<ProjectKey, string>;
  /** 渠道 ID 映射 */
  channels: Map<ChannelKey, string>;
}
