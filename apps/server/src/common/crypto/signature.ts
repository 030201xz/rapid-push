/**
 * RSA 签名工具模块
 *
 * 提供 Expo Updates 协议兼容的代码签名功能：
 * - RSA-SHA256 签名
 * - SFV (Structured Field Values) 格式
 * - 密钥对生成
 */

import {
  createSign,
  createVerify,
  generateKeyPairSync,
} from 'node:crypto';

// ========== 类型定义 ==========

/** RSA 密钥对 */
export interface KeyPair {
  /** PEM 格式公钥 */
  publicKey: string;
  /** PEM 格式私钥 */
  privateKey: string;
}

// ========== 密钥生成 ==========

/**
 * 生成 RSA 2048-bit 密钥对
 *
 * 公钥使用 SPKI 格式，私钥使用 PKCS8 格式
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

// ========== 签名与验证 ==========

/**
 * 使用私钥对数据进行 RSA-SHA256 签名
 *
 * @param data - 待签名数据
 * @param privateKey - PEM 格式私钥
 * @returns Base64 编码的签名
 */
export function signData(data: string, privateKey: string): string {
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

/**
 * 使用公钥验证签名
 *
 * @param data - 原始数据
 * @param signature - Base64 编码的签名
 * @param publicKey - PEM 格式公钥
 * @returns 验证是否通过
 */
export function verifySignature(
  data: string,
  signature: string,
  publicKey: string
): boolean {
  const verify = createVerify('RSA-SHA256');
  verify.update(data);
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}

// ========== Expo 协议签名 ==========

/**
 * 对 Expo Manifest 进行签名
 *
 * 符合 Expo Updates 协议的签名格式
 * 使用 SFV (Structured Field Values) 格式: sig=:base64signature:
 *
 * @param manifestJson - Manifest JSON 字符串
 * @param privateKey - PEM 格式私钥
 * @returns expo-signature 头的值
 */
export function signManifest(
  manifestJson: string,
  privateKey: string
): string {
  const signature = signData(manifestJson, privateKey);
  // Expo 使用 SFV (Structured Field Values) 格式
  return `sig=:${signature}:`;
}

/**
 * 验证 Expo Manifest 签名
 *
 * @param manifestJson - Manifest JSON 字符串
 * @param signatureHeader - expo-signature 头的值
 * @param publicKey - PEM 格式公钥
 * @returns 验证是否通过
 */
export function verifyManifestSignature(
  manifestJson: string,
  signatureHeader: string,
  publicKey: string
): boolean {
  // 解析 SFV 格式 sig=:base64signature:
  const match = signatureHeader.match(/sig=:([^:]+):/);
  if (!match) {
    return false;
  }
  const signature = match[1];
  if (!signature) {
    return false;
  }
  return verifySignature(manifestJson, signature, publicKey);
}
