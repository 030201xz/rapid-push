import { defineConfig } from 'tsup';

/**
 * SDK 构建配置
 *
 * - ESM + CJS 双格式输出
 * - 生成类型声明文件
 * - React Native 兼容
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: [
    // Peer dependencies - 不打包
    'react',
    'react-native',
    'expo-updates',
    'expo-constants',
  ],
  esbuildOptions(options) {
    // React Native 兼容
    options.platform = 'neutral';
  },
});
