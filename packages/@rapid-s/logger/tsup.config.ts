import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'index.ts',
    browser: 'browser.ts',
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
  external: [],
  cjsInterop: true,
});
