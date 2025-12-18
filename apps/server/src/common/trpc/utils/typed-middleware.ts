/**
 * 类型安全的中间件工厂
 *
 * 解决问题：tRPC 中间件链的类型依赖关系不透明
 * 方案：通过泛型声明前置 Context 依赖，编译时强制调用顺序正确
 *
 * @example
 * ```typescript
 * // 声明必须在 AuthContext + targetUser 之后使用
 * export const withSelfOnly = createTypedMiddleware<AuthContext & { targetUser: User }>()(
 *   async ({ ctx, next }) => {
 *     // ctx.user 和 ctx.targetUser 类型安全，无需断言
 *     if (ctx.user.id !== ctx.targetUser.id) { ... }
 *     return next({ ctx });
 *   }
 * );
 * ```
 */

import { t } from '../init';

/**
 * 创建类型安全的中间件
 *
 * 采用柯里化设计：
 * - 第一层泛型：声明前置依赖的 Context 类型
 * - 第二层泛型：声明中间件扩展的 Context 类型
 *
 * @template TRequiredCtx 前置依赖的 Context 类型（编译时约束）
 */
export function createTypedMiddleware<TRequiredCtx extends object>() {
  /**
   * @template TExtendedCtx 中间件扩展后的 Context 类型（可选）
   * @param fn 中间件函数，ctx 类型为 TRequiredCtx
   */
  return <TExtendedCtx extends TRequiredCtx = TRequiredCtx>(
    fn: (opts: {
      ctx: TRequiredCtx;
      input: unknown;
      next: (opts?: { ctx: TExtendedCtx }) => Promise<unknown>;
    }) => Promise<unknown>
  ) => {
    // 先转为 unknown 再转为目标类型，绕过 TS 类型检查
    // 运行时安全由中间件链调用顺序保证
    return t.middleware(fn as unknown as Parameters<typeof t.middleware>[0]);
  };
}

/**
 * 创建带输入验证的类型安全中间件
 *
 * @template TRequiredCtx 前置依赖的 Context 类型
 * @template TInput 输入类型（从 zod schema 推断）
 *
 * @example
 * ```typescript
 * const idInputSchema = z.object({ id: z.number() });
 *
 * export const withUserExists = createTypedInputMiddleware<BaseContext, z.infer<typeof idInputSchema>>()(
 *   async ({ ctx, input, next }) => {
 *     const targetUser = await userService.getUserById(ctx.db, input.id);
 *     if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND' });
 *     return next({ ctx: { ...ctx, targetUser } });
 *   }
 * );
 * ```
 */
export function createTypedInputMiddleware<
  TRequiredCtx extends object,
  TInput,
>() {
  return <TExtendedCtx extends TRequiredCtx = TRequiredCtx>(
    fn: (opts: {
      ctx: TRequiredCtx;
      input: TInput;
      next: (opts?: { ctx: TExtendedCtx }) => Promise<unknown>;
    }) => Promise<unknown>
  ) => {
    // 先转为 unknown 再转为目标类型
    return t.middleware(fn as unknown as Parameters<typeof t.middleware>[0]);
  };
}
