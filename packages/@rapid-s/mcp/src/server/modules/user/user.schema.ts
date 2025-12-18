/**
 * Zod 输入验证 Schema
 *
 * 用于 GraphQL 输入验证
 */

import { z } from 'zod';

/** 用户名验证规则 */
const usernameSchema = z
  .string()
  .min(3, '用户名至少 3 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线');

/** 邮箱验证规则 */
const emailSchema = z.email('邮箱格式不正确');

/** 密码验证规则 */
const passwordSchema = z
  .string()
  .min(8, '密码至少 8 个字符')
  .max(100, '密码最多 100 个字符')
  .regex(/[A-Z]/, '密码必须包含至少一个大写字母')
  .regex(/[a-z]/, '密码必须包含至少一个小写字母')
  .regex(/[0-9]/, '密码必须包含至少一个数字');

/**
 * 创建用户输入 Schema
 *
 * 包含运行时验证规则（密码复杂度等）
 */
export const createUserInputSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/**
 * 创建用户输入 DTO
 *
 * 用于 Service 层参数类型，包含验证后的数据
 */
export type CreateUserInputDTO = z.infer<typeof createUserInputSchema>;

/**
 * 更新用户输入 Schema
 */
export const updateUserInputSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
});

/**
 * 更新用户输入 DTO
 *
 * 用于 Service 层参数类型，包含验证后的数据
 */
export type UpdateUserInputDTO = z.infer<typeof updateUserInputSchema>;

/**
 * 用户 ID 参数 Schema
 */
export const userIdParamSchema = z.object({
  id: z.string().min(1, '用户 ID 不能为空'),
});

/** 用户 ID 参数类型 */
export type UserIdParam = z.infer<typeof userIdParamSchema>;

/**
 * 验证输入数据
 *
 * @param schema - Zod Schema
 * @param data - 输入数据
 * @returns 验证后的数据
 * @throws ValidationError
 */
export function validateInput<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
