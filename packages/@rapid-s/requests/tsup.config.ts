import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    // 在生成的 .d.ts 文件中添加 Bun 类型引用
    banner: '/// <reference types="bun-types" />\n',
  },
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  treeshake: true,
  outDir: "dist",
});
