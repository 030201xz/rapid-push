/**
 * 依赖注入容器
 *
 * 封装 tsyringe 容器，提供类型安全的依赖注入能力
 * 支持单例、瞬态、作用域等生命周期管理
 */

import 'reflect-metadata';
import {
  container as tsyringeContainer,
  type DependencyContainer,
} from 'tsyringe';

/** 获取全局 DI 容器 */
export const container: DependencyContainer = tsyringeContainer;

/**
 * 创建子容器
 *
 * 用于请求级别的作用域隔离
 * 每个 GraphQL 请求可以创建独立的子容器
 */
export function createChildContainer(): DependencyContainer {
  return container.createChildContainer();
}

/**
 * 解析依赖
 *
 * 类型安全的依赖解析方法
 * @param token - 注入令牌
 * @returns 解析后的实例
 */
export function resolve<T>(token: symbol): T {
  return container.resolve<T>(token);
}

/**
 * 检查依赖是否已注册
 *
 * @param token - 注入令牌
 * @returns 是否已注册
 */
export function isRegistered(token: symbol): boolean {
  return container.isRegistered(token);
}

/** 重新导出 tsyringe 装饰器 */
export { inject, injectable, singleton } from 'tsyringe';
