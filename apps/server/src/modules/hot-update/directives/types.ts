/**
 * 指令模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type {
  Directive,
  DirectiveType,
  NewDirective,
  UpdateDirective,
} from './schema';

// ========== 常量导出 ==========
export { DIRECTIVE_TYPE } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertDirectiveSchema,
  selectDirectiveSchema,
  updateDirectiveSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateDirectiveResult,
  DeleteDirectiveResult,
  GetDirectiveResult,
  ListDirectivesResult,
  UpdateDirectiveResult,
} from './service';
