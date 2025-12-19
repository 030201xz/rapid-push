/**
 * Manifest 模块入口
 */

export { manifestRouter } from './router';
export { checkUpdateRequestSchema, platformSchema } from './schema';
export * as ManifestService from './service';
export { RESPONSE_TYPE } from './types';
export type {
  CheckUpdateRequest,
  CheckUpdateResponse,
  Directive,
  DirectiveType,
  Manifest,
  ManifestAsset,
  Platform,
  ResponseType,
} from './types';
