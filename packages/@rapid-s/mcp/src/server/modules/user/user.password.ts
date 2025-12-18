/**
 * 密码加密策略
 *
 * 策略模式：可切换不同的加密算法
 */

/**
 * 密码策略接口
 */
export interface IPasswordStrategy {
  /**
   * 加密密码
   *
   * @param password - 明文密码
   * @returns 密码哈希
   */
  hash(password: string): Promise<string>;

  /**
   * 验证密码
   *
   * @param password - 明文密码
   * @param hash - 密码哈希
   * @returns 是否匹配
   */
  verify(password: string, hash: string): Promise<boolean>;
}

/**
 * Bun 原生密码策略
 *
 * 使用 Bun.password（基于 Argon2）
 */
export class BunPasswordStrategy implements IPasswordStrategy {
  async hash(password: string): Promise<string> {
    return Bun.password.hash(password, {
      algorithm: 'argon2id',
      memoryCost: 65536, // 64 MB
      timeCost: 2,
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
  }
}

/**
 * 简单密码策略（仅用于测试）
 *
 * 使用 SHA-256，不建议在生产环境使用
 */
export class SimplePasswordStrategy implements IPasswordStrategy {
  async hash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hash(password);
    return passwordHash === hash;
  }
}

/** 默认密码策略 */
export const defaultPasswordStrategy: IPasswordStrategy =
  new BunPasswordStrategy();
