/**
 * 认证模块统一导出
 */
export {
  signToken,
  verifyToken,
  verifyTokenLegacy,
  type JwtUserPayload,
  type SignTokenOptions,
  type VerifyTokenResult,
} from './jwt';
