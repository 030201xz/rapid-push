/**
 * 组织成员模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  MemberRole,
  NewOrganizationMember,
  OrganizationMember,
  UpdateOrganizationMember,
} from './schema';

// ========== 常量导出 ==========
export { MEMBER_ROLE } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertOrganizationMemberSchema,
  selectOrganizationMemberSchema,
  updateOrganizationMemberSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  AddMemberResult,
  GetMembershipResult,
  ListMembershipsResult,
  ListMembersResult,
  UpdateMemberResult,
} from './service';
