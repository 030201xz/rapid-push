/**
 * 核心类型工具
 *
 * 只保留实际使用的类型，避免代码膨胀
 */

/**
 * 品牌类型 - 用于区分相同基础类型的不同语义
 *
 * @example
 * type UserId = Brand<string, 'UserId'>;
 * type OrderId = Brand<string, 'OrderId'>;
 *
 * // 编译时区分，防止混用
 * const userId: UserId = 'u123' as UserId;
 * const orderId: OrderId = 'o456' as OrderId;
 */
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };
