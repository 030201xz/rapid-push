/**
 * 项目模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { NewProject, Project, UpdateProject } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertProjectSchema,
  selectProjectSchema,
  updateProjectSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateProjectResult,
  DeleteProjectResult,
  GetProjectResult,
  ListProjectsResult,
  UpdateProjectResult,
} from './service';
