/**
 * 依赖注入模块统一导出
 */

export {
  container,
  createChildContainer,
  inject,
  injectable,
  isRegistered,
  resolve,
  singleton,
} from './container';

export {
  INFRA_TOKENS,
  TOKENS,
  USER_TOKENS,
  type TokenKey,
  type TokenValue,
} from './tokens';
