/**
 * SHA-256 哈希工具
 *
 * 用于内容寻址存储的文件哈希计算
 */

/**
 * 计算 SHA-256 哈希并返回 Base64 URL 安全编码
 *
 * @param data - 输入数据
 * @returns Base64 URL 安全编码的哈希值
 */
export function sha256Base64Url(data: Buffer | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  const digest = hasher.digest();

  // 转换为 Base64 URL 安全编码
  return Buffer.from(digest)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 计算 SHA-256 哈希并返回十六进制编码
 *
 * @param data - 输入数据
 * @returns 十六进制编码的哈希值
 */
export function sha256Hex(data: Buffer | Uint8Array): string {
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  return hasher.digest('hex');
}
