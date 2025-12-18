import { initTRPC, TRPCError } from '@trpc/server';
import type { Context as HonoContext } from 'hono';
import { db } from './db';

// ========== 用户类型定义（认证上下文中的用户） ==========
export interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
}

// ========== Context 定义 ==========
export function createContext(c: HonoContext) {
  return {
    db,
    req: c.req,
    requestId: c.get('requestId') as string | undefined,
    // 从 header 获取认证信息（实际项目中解析 JWT）
    getUser: async (): Promise<AuthUser | null> => {
      const token = c.req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return null;
      // TODO: 实现 JWT 验证逻辑
      return null;
    },
  };
}

export type Context = ReturnType<typeof createContext>;

// ========== tRPC 初始化 ==========
const t = initTRPC.context<Context>().create();

// ========== 全局中间件：请求计时 ==========
const timingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = performance.now();
  const result = await next();
  const duration = performance.now() - start;
  console.log(`[tRPC] ${type} ${path} - ${duration.toFixed(2)}ms`);
  return result;
});

// ========== 基础 Procedure（带全局中间件） ==========
const baseProcedure = t.procedure.use(timingMiddleware);

// ========== Public Procedure（无需认证） ==========
export const publicProcedure = baseProcedure;

// ========== Protected Procedure（需登录） ==========
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getUser();
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: '请先登录',
    });
  }
  // 类型收窄：后续 procedure 的 ctx.user 一定存在
  return next({ ctx: { ...ctx, user } });
});

export const protectedProcedure = baseProcedure.use(isAuthed);

// ========== Admin Procedure（需管理员权限） ==========
const isAdmin = t.middleware(async ({ ctx, next }) => {
  const user = await ctx.getUser();
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '请先登录' });
  }
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '需要管理员权限' });
  }
  return next({ ctx: { ...ctx, user } });
});

export const adminProcedure = baseProcedure.use(isAdmin);

// ========== 导出 ==========
export const router = t.router;
export const middleware = t.middleware;
