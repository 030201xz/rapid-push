/**
 * Expo Updates 协议中间件
 *
 * 处理 Expo Updates v1 协议要求的请求头验证和响应头设置
 * 符合规范：https://docs.expo.dev/technical-specs/expo-updates-1/
 */

import { t } from '../init';
import { publicProcedure } from './public';

// ========== 类型定义 ==========

/** Expo Updates 请求上下文 */
export interface ExpoUpdatesContext {
  /** Expo 协议版本 */
  expoProtocolVersion: string;
  /** 平台（ios/android） */
  expoPlatform: string;
  /** 运行时版本 */
  expoRuntimeVersion: string;
  /** 是否期望签名 */
  expoExpectSignature?: string;
  /** 服务器定义的请求头 */
  expoServerDefinedHeaders?: Record<string, string>;
}

// ========== Expo Updates 中间件 ==========

/**
 * Expo Updates 协议中间件
 *
 * 功能：
 * 1. 验证必需的 Expo 请求头
 * 2. 将 Expo 头信息注入 Context
 * 3. 自动设置响应头
 */
export const expoUpdatesMiddleware = t.middleware(async opts => {
  const { ctx } = opts;
  const { honoContext } = ctx;

  // 1. 读取 Expo 请求头
  const protocolVersion = honoContext.req.header(
    'expo-protocol-version'
  );
  const platform = honoContext.req.header('expo-platform');
  const runtimeVersion = honoContext.req.header(
    'expo-runtime-version'
  );
  const expectSignature = honoContext.req.header(
    'expo-expect-signature'
  );

  // 2. 验证必需头（可选：根据需求决定是否严格验证）
  // 注意：当前实现允许通过 tRPC 输入参数传递这些信息
  // 如果需要强制使用 HTTP 头，取消以下注释：

  // if (!protocolVersion) {
  //   throw new TRPCError({
  //     code: 'BAD_REQUEST',
  //     message: 'Missing expo-protocol-version header',
  //   });
  // }

  // if (protocolVersion !== '1') {
  //   throw new TRPCError({
  //     code: 'NOT_ACCEPTABLE',
  //     message: 'Unsupported protocol version',
  //   });
  // }

  // 3. 设置 Expo 响应头（符合规范）
  honoContext.header('expo-protocol-version', '1');
  honoContext.header('expo-sfv-version', '0');

  // 4. 设置 Cache-Control（Manifest 不应缓存）
  honoContext.header('cache-control', 'private, max-age=0');

  // 5. 设置 expo-manifest-filters（用于客户端过滤更新）
  // SFV 字典格式，用于按元数据字段过滤更新
  // 示例：expo-manifest-filters: branchName="main", releaseChannel="production"
  // 当前暂时为空，后续可根据业务需求扩展
  honoContext.header('expo-manifest-filters', '');

  // 6. 设置 expo-server-defined-headers（用于持久化客户端请求头）
  // Expo SFV 是 RFC 8941 的子集，支持字典格式【https://docs.expo.dev/technical-specs/expo-sfv-0/】
  // SFV 字典格式，定义客户端必须在后续请求中包含的头
  // 当前暂时为空，后续可根据业务需求扩展
  honoContext.header('expo-server-defined-headers', '');

  // 7. 注入 Expo 上下文
  const expoContext: ExpoUpdatesContext = {
    expoProtocolVersion: protocolVersion ?? '1',
    expoPlatform: platform ?? '',
    expoRuntimeVersion: runtimeVersion ?? '',
    expoExpectSignature: expectSignature,
  };

  return opts.next({
    ctx: {
      ...ctx,
      expo: expoContext,
    },
  });
});

// ========== Expo Manifest Procedure ==========

/**
 * 专用于 Expo Manifest 的 Procedure
 *
 * 已应用 Expo Updates 中间件，自动处理协议头
 */
export const expoManifestProcedure = publicProcedure.use(
  expoUpdatesMiddleware
);
