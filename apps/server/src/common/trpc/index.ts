/**
 * tRPC 统一导出入口
 */
export { createContext, type Context } from './context';
export { t } from './init';
export { publicProcedure, protectedProcedure, adminProcedure } from './procedures';
export { createTypedMiddleware, createTypedInputMiddleware } from './utils';

// router 和 middleware 从 t 实例导出
import { t } from './init';
export const router = t.router;
export const middleware = t.middleware;
