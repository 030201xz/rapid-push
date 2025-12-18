import { defineConfig } from 'tsup';

/**
 * 类型导出构建配置
 *
 * 只生成 .d.ts 声明文件，供前端端到端类型安全使用
 */
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
  },
  format: ['esm'],
  dts: { only: true }, // 只生成 .d.ts，无 JS 输出
  outDir: 'dist/types',
  clean: false, // 不清理 dist，保留 bun build 的输出
  splitting: false,
  treeshake: true,
  external: [
    // 外部依赖，不打包进类型
    'drizzle-orm',
    'drizzle-zod',
    'zod',
    '@trpc/server',
    'hono',
    'jose',
    'postgres',
    '@rapid-s/config',
    '@rapid-s/logger',
  ],
});
