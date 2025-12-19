/**
 * Core 模块聚合入口
 *
 * 包含两个子域：
 * - identify: 用户身份管理（users、auth）
 * - access-control: 访问控制（roles、permissions、mappings）
 */

import { router } from '../../common/trpc';
import { accessControlRouter } from './access-control';
import { identifyRouter } from './identify';

// ========== Core 域路由聚合 ==========
export const coreRouter = router({
  identify: identifyRouter,
  accessControl: accessControlRouter,
});

// ========== 重导出子域类型命名空间 ==========
export {
  ORG_ADMIN_ROLES,
  ORG_ROLE_CODE,
  ORG_ROLES_SEED,
  PermissionsTypes,
  RolePermissionMappingsTypes,
  RolesTypes,
  SCOPE_TYPE,
  UserRoleMappingsTypes,
  type OrgRoleCode,
  type ScopeType,
} from './access-control';
export { UsersTypes } from './identify';
