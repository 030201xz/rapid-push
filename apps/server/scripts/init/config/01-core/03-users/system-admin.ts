/**
 * 系统管理员用户配置
 */

import type { UserConfig } from '../types';

/** 系统管理员用户 */
export const systemAdminUser: UserConfig = {
  key: 'SYSTEM_ADMIN',
  username: 'admin',
  nickname: '系统管理员',
  email: 'admin@rapid-s.local',
  phone: '13800000001',
  // 明文密码，执行时自动哈希
  plainPassword: 'Admin@123456',
  status: 'active',
  isEmailVerified: true,
  isPhoneVerified: true,
  roleKey: 'SUPER_ADMIN',
};
