/**
 * 模块统一管理
 *
 * 集中管理所有业务模块的注册和 Resolvers 导出
 * 新增模块只需在此文件添加，无需修改 app.ts
 */

import type { Resolvers } from '../generated/graphql';
import { baseResolvers } from '../infrastructure/graphql';
import { registerUserModule, userResolvers } from './user';

/**
 * 注册所有业务模块
 *
 * 将各模块的服务注册到 DI 容器
 */
export function registerModules(): void {
  registerUserModule();
  // 新增模块在此添加：registerXxxModule();
}

/**
 * 合并后的 Resolvers
 *
 * 包含 baseResolvers + 所有业务模块的 resolvers
 */
export const resolvers: Resolvers = mergeResolvers(
  baseResolvers,
  userResolvers,
  // 新增模块在此添加：xxxResolvers,
);

/**
 * 合并多个 Resolvers
 *
 * 深度合并 Query、Mutation 等顶层字段
 */
function mergeResolvers(...resolversList: Resolvers[]): Resolvers {
  const merged: Resolvers = {};

  for (const item of resolversList) {
    for (const [type, fields] of Object.entries(item)) {
      const key = type as keyof Resolvers;
      if (!merged[key]) {
        // @ts-expect-error - 动态合并需要类型断言
        merged[key] = {};
      }
      Object.assign(merged[key]!, fields);
    }
  }

  return merged;
}
