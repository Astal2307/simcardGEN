import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // node:sqlite существует только с префиксом — не даём tsup его срезать
  removeNodeProtocol: false,
  // shared-пакет поставляется исходниками — вшиваем его в бандл
  noExternal: ['@simrush/shared']
});
