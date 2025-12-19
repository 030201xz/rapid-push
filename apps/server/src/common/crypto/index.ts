/**
 * 加密工具模块入口
 *
 * 提供 RSA 签名、密钥生成等加密功能
 *
 * 主要实现：Bun Web Crypto API（异步，适合边缘环境部署）
 * 备用实现：Node.js crypto 模块（同步，仅用于测试对比）
 */

// ========== Bun 实现（异步，推荐用于生产环境） ==========
export {
  generateKeyPairAsync,
  signDataAsync,
  signManifestAsync,
  verifyManifestSignatureAsync,
  verifySignatureAsync,
  type KeyPair,
} from './signature-bun';

// ========== Node.js 实现（同步，仅用于测试对比） ==========
export {
  generateKeyPair,
  signData,
  signManifest,
  verifyManifestSignature,
  verifySignature,
} from './signature';
