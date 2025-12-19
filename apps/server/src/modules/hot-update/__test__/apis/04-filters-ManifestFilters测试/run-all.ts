#!/usr/bin/env bun
/**
 * 批量运行 Manifest Filters 测试场景
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/04-filters/run-all.ts
 */

import { createTestLogger } from '../_shared';

const logger = createTestLogger('Filters:RunAll');

const testScripts = [
  '00-setup.ts',
  '01-configure-filters.ts',
  '02-upload-with-metadata.ts',
  '03-check-filters.ts',
  '99-cleanup.ts',
];

async function runScript(scriptPath: string) {
  logger.info('='.repeat(60));
  logger.info(`▶️  运行: ${scriptPath}`);
  logger.info('='.repeat(60));

  const proc = Bun.spawn(['bun', 'run', scriptPath], {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(
      `脚本执行失败: ${scriptPath} (退出码: ${exitCode})`
    );
  }

  logger.info(`\n✅ ${scriptPath} 执行完成\n`);
}

async function main() {
  logger.info('\n🚀 开始运行 Manifest Filters 完整测试流程\n');

  const baseDir = 'src/modules/hot-update/__test__/apis/04-filters';

  try {
    for (const script of testScripts) {
      await runScript(`${baseDir}/${script}`);
      // 每个测试之间稍作延迟
      await Bun.sleep(500);
    }

    logger.info('='.repeat(60));
    logger.info('🎉 所有测试执行完成！');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('❌ 测试流程失败:', error);
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('执行失败:', err);
  process.exit(1);
});
