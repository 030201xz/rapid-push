/**
 * RSA 签名工具模块 - Bun 实现
 *
 * 使用 Bun 内置的 Web Crypto API 实现签名功能
 * 与 Node.js crypto 实现保持 API 兼容
 */

// ========== 类型定义 ==========

/** RSA 密钥对 */
export interface KeyPair {
  /** PEM 格式公钥 */
  publicKey: string;
  /** PEM 格式私钥 */
  privateKey: string;
}

// ========== 工具函数 ==========

/**
 * ArrayBuffer 转 Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

/**
 * Base64 转 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return Buffer.from(base64, 'base64').buffer;
}

/**
 * PEM 格式转 ArrayBuffer（移除头尾和换行）
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s/g, '');
  return base64ToArrayBuffer(base64);
}

/**
 * ArrayBuffer 转 PEM 格式
 */
function arrayBufferToPem(
  buffer: ArrayBuffer,
  type: 'PUBLIC KEY' | 'PRIVATE KEY'
): string {
  const base64 = arrayBufferToBase64(buffer);
  // 每 64 字符换行
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${type}-----\n${lines.join(
    '\n'
  )}\n-----END ${type}-----`;
}

// ========== 密钥生成 ==========

/**
 * 生成 RSA 2048-bit 密钥对（异步）
 *
 * 使用 Web Crypto API 生成密钥
 */
export async function generateKeyPairAsync(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['sign', 'verify']
  );

  // 导出为 SPKI/PKCS8 格式
  const publicKeyBuffer = await crypto.subtle.exportKey(
    'spki',
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey
  );

  return {
    publicKey: arrayBufferToPem(publicKeyBuffer, 'PUBLIC KEY'),
    privateKey: arrayBufferToPem(privateKeyBuffer, 'PRIVATE KEY'),
  };
}

// ========== 签名与验证 ==========

/**
 * 导入私钥用于签名
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * 导入公钥用于验证
 */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

/**
 * 使用私钥对数据进行 RSA-SHA256 签名（异步）
 *
 * @param data - 待签名数据
 * @param privateKey - PEM 格式私钥
 * @returns Base64 编码的签名
 */
export async function signDataAsync(
  data: string,
  privateKey: string
): Promise<string> {
  const key = await importPrivateKey(privateKey);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    dataBuffer
  );
  return arrayBufferToBase64(signature);
}

/**
 * 使用公钥验证签名（异步）
 *
 * @param data - 原始数据
 * @param signature - Base64 编码的签名
 * @param publicKey - PEM 格式公钥
 * @returns 验证是否通过
 */
export async function verifySignatureAsync(
  data: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  const key = await importPublicKey(publicKey);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = base64ToArrayBuffer(signature);
  return crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signatureBuffer,
    dataBuffer
  );
}

// ========== Expo 协议签名 ==========

/**
 * 对 Expo Manifest 进行签名（异步）
 *
 * 符合 Expo Updates 协议的签名格式
 * 使用 SFV (Structured Field Values) 格式: sig=:base64signature:
 *
 * @param manifestJson - Manifest JSON 字符串
 * @param privateKey - PEM 格式私钥
 * @returns expo-signature 头的值
 */
export async function signManifestAsync(
  manifestJson: string,
  privateKey: string
): Promise<string> {
  const signature = await signDataAsync(manifestJson, privateKey);
  // Expo 使用 SFV (Structured Field Values) 格式
  return `sig=:${signature}:`;
}

/**
 * 验证 Expo Manifest 签名（异步）
 *
 * @param manifestJson - Manifest JSON 字符串
 * @param signatureHeader - expo-signature 头的值
 * @param publicKey - PEM 格式公钥
 * @returns 验证是否通过
 */
export async function verifyManifestSignatureAsync(
  manifestJson: string,
  signatureHeader: string,
  publicKey: string
): Promise<boolean> {
  // 解析 SFV 格式 sig=:base64signature:
  const match = signatureHeader.match(/sig=:([^:]+):/);
  if (!match) {
    return false;
  }
  const signature = match[1];
  if (!signature) {
    return false;
  }
  return verifySignatureAsync(manifestJson, signature, publicKey);
}
