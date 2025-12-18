import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // 主入口 - 导出所有类型和工具
    index: 'src/index-types.ts',
    // 核心类型和装饰器导出
    core: 'src/core/index.ts',
    // 共享工具函数导出
    shared: 'src/shared/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  sourcemap: true,
  target: 'es2020',
  outDir: 'dist',
  external: [
    '@modelcontextprotocol/sdk',
    'reflect-metadata',
    'tsyringe',
    'zod',
    'decimal.js',
    'bun',
    'node:path',
  ],
  cjsInterop: true,
});
