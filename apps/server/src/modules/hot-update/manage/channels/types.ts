/**
 * 渠道模块类型导出
 *
 * 供前端使用的类型定义
 */

// ========== Schema 类型 ==========
export type { Channel, NewChannel, UpdateChannel } from './schema';

// ========== Zod Schema（前端可复用验证） ==========
export {
  insertChannelSchema,
  selectChannelSchema,
  updateChannelSchema,
} from './schema';

// ========== Service 返回类型 ==========
export type {
  CreateChannelResult,
  DeleteChannelResult,
  GetChannelResult,
  ListChannelsResult,
  UpdateChannelResult,
} from './service';
