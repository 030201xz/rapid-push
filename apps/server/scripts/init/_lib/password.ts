/**
 * 密码工具
 *
 * 使用 Bun 内置的密码哈希功能
 */

/**
 * 对明文密码进行哈希
 *
 * @param plainPassword 明文密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(
  plainPassword: string
): Promise<string> {
  return Bun.password.hash(plainPassword, {
    algorithm: 'bcrypt',
    cost: 10,
  });
}

/**
 * 验证密码是否正确
 *
 * @param plainPassword 明文密码
 * @param hashedPassword 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return Bun.password.verify(plainPassword, hashedPassword);
}
