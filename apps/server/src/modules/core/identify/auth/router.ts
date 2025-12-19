/**
 * Auth 模块路由
 *
 * 提供认证相关接口：登录、登出、刷新 Token、会话管理等
 */

import { getGlobalRedisClient } from '@/common/database/redis/rapid-s';
import {
  protectedProcedure,
  publicProcedure,
  router,
} from '@/common/trpc';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { roles } from '../../access-control/roles/schema';
import { userRoleMappings } from '../../access-control/user-role-mappings/schema';
import {
  deviceService,
  login,
  logoutAllSessions,
  logoutSession,
  refreshTokens,
  sessionService,
} from './services';

// ============================================================================
// 输入 Schema
// ============================================================================

/** 登录输入 Schema */
const loginInputSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
  deviceFingerprint: z.string().optional(),
  deviceName: z.string().optional(),
  deviceType: z
    .enum(['desktop', 'mobile', 'tablet', 'api', 'unknown'])
    .optional(),
});

/** 刷新 Token 输入 Schema */
const refreshInputSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
});

/** 会话 ID 输入 Schema */
const sessionIdSchema = z.object({
  sessionId: z.uuid(),
});

/** 设备 ID 输入 Schema */
const deviceIdSchema = z.object({
  deviceId: z.uuid(),
});

// ============================================================================
// 辅助函数
// ============================================================================

/** 密码验证函数 (使用 Bun 内置 API) */
async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  // 使用 Bun 内置的密码验证 API
  return Bun.password.verify(plain, hash);
}

/** 获取用户角色 code 列表 */
async function getUserRoleCodes(
  db: Parameters<typeof login>[0],
  userId: string
): Promise<string[]> {
  // 查询用户的活跃角色映射，关联角色表获取 code
  const mappings = await db
    .select({ roleCode: roles.code })
    .from(userRoleMappings)
    .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
    .where(eq(userRoleMappings.userId, userId));

  return mappings.map(m => m.roleCode);
}

/** 从请求中提取 IP 和 User-Agent */
function extractRequestInfo(ctx: { requestId?: string }) {
  // 在实际实现中，需要从 Hono context 获取
  // 这里返回占位值，由 router 层处理
  return {
    ipAddress: undefined as string | undefined,
    userAgent: undefined as string | undefined,
  };
}

// ============================================================================
// Auth 路由
// ============================================================================

export const authRouter = router({
  // ========== 公开接口 ==========

  /** 用户登录 */
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(async ({ ctx, input }) => {
      const redis = getGlobalRedisClient();
      const { ipAddress, userAgent } = extractRequestInfo(ctx);

      const result = await login(
        ctx.db,
        redis,
        {
          ...input,
          ipAddress,
          userAgent,
        },
        verifyPassword,
        getUserRoleCodes
      );

      if (!result.success) {
        // 返回错误信息，不抛异常（让前端处理）
        return {
          success: false as const,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        };
      }

      return {
        success: true as const,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
    }),

  /** 刷新 Token */
  refresh: publicProcedure
    .input(refreshInputSchema)
    .mutation(async ({ ctx, input }) => {
      const redis = getGlobalRedisClient();
      const { ipAddress, userAgent } = extractRequestInfo(ctx);

      const result = await refreshTokens(
        ctx.db,
        redis,
        input.refreshToken,
        getUserRoleCodes,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        return {
          success: false as const,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        };
      }

      return {
        success: true as const,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
    }),

  // ========== 需认证接口 ==========

  /** 获取当前用户信息 */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.user;
  }),

  /** 退出当前会话 (单设备登出) */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const redis = getGlobalRedisClient();
    // 使用当前 JWT 的 sessionId 和 jti（用于 AT 黑名单）
    const result = await logoutSession(
      ctx.db,
      redis,
      ctx.sessionId,
      ctx.jti
    );
    return result;
  }),

  /** 退出所有会话 (全设备登出) */
  logoutAll: protectedProcedure.mutation(async ({ ctx }) => {
    const redis = getGlobalRedisClient();
    // 全设备登出时传入当前 AT 的 jti，确保当前 Token 也失效
    const result = await logoutAllSessions(
      ctx.db,
      redis,
      ctx.user.id,
      ctx.jti
    );
    return result;
  }),

  /** 获取当前用户的所有活跃会话 */
  sessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await sessionService.getActiveSessionsByUserId(
      ctx.db,
      ctx.user.id
    );
    return sessions;
  }),

  /** 撤销指定会话 (踢掉其他设备) */
  revokeSession: protectedProcedure
    .input(sessionIdSchema)
    .mutation(async ({ ctx, input }) => {
      // 验证该会话属于当前用户
      const session = await sessionService.getSessionBySessionId(
        ctx.db,
        input.sessionId
      );
      if (!session || session.userId !== ctx.user.id) {
        return { success: false, message: '会话不存在或无权操作' };
      }

      const redis = getGlobalRedisClient();
      const result = await logoutSession(
        ctx.db,
        redis,
        input.sessionId
      );
      return result;
    }),

  // ========== 设备管理 ==========

  /** 获取当前用户的所有设备 */
  devices: protectedProcedure.query(async ({ ctx }) => {
    const devices = await deviceService.getDevicesByUserId(
      ctx.db,
      ctx.user.id
    );
    return devices;
  }),

  /** 设置设备为可信 */
  trustDevice: protectedProcedure
    .input(deviceIdSchema)
    .mutation(async ({ ctx, input }) => {
      // 验证设备属于当前用户
      const device = await deviceService.getDeviceById(
        ctx.db,
        input.deviceId
      );
      if (!device || device.userId !== ctx.user.id) {
        return { success: false, message: '设备不存在或无权操作' };
      }

      const result = await deviceService.trustDevice(
        ctx.db,
        input.deviceId
      );
      return { success: !!result, device: result };
    }),

  /** 取消设备信任 */
  untrustDevice: protectedProcedure
    .input(deviceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const device = await deviceService.getDeviceById(
        ctx.db,
        input.deviceId
      );
      if (!device || device.userId !== ctx.user.id) {
        return { success: false, message: '设备不存在或无权操作' };
      }

      const result = await deviceService.untrustDevice(
        ctx.db,
        input.deviceId
      );
      return { success: !!result, device: result };
    }),

  /** 删除设备 */
  removeDevice: protectedProcedure
    .input(deviceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const device = await deviceService.getDeviceById(
        ctx.db,
        input.deviceId
      );
      if (!device || device.userId !== ctx.user.id) {
        return { success: false, message: '设备不存在或无权操作' };
      }

      const success = await deviceService.deleteDevice(
        ctx.db,
        input.deviceId
      );
      return { success };
    }),
});
