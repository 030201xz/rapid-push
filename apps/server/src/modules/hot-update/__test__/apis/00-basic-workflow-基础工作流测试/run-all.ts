/**
 * 基础工作流测试套件 - 运行所有测试
 *
 * 测试场景：
 * 1. 初始化环境（组织、项目、渠道）
 * 2. 上传更新包
 * 3. 客户端检查更新
 * 4. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/00-basic-workflow-基础工作流测试/run-all.ts
 */

import { execSync } from 'node:child_process';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('BasicWorkflow:RunAll');

/** 测试步骤列表 */
const TEST_STEPS = [
  '00-setup.ts',
  '01-upload.ts',
  '02-check.ts',
  '99-cleanup.ts',
] as const;

/** 执行单个测试步骤 */
async function runStep(stepFile: string): Promise<void> {
  const stepPath = `src/modules/hot-update/__test__/apis/00-basic-workflow-基础工作流测试/${stepFile}`;

  logger.info('='.repeat(60));
  logger.info(`▶️  运行: ${stepPath}`);
  logger.info('='.repeat(60));

  try {
    execSync(`bun run ${stepPath}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logger.info(`\n✅ ${stepPath} 执行完成\n`);
  } catch (error) {
    logger.error(`\n❌ ${stepPath} 执行失败\n`);
    throw error;
  }
}

async function main() {
  logger.info('\n🚀 开始运行基础工作流完整测试流程\n');

  try {
    for (const step of TEST_STEPS) {
      await runStep(step);
    }

    logger.info('='.repeat(60));
    logger.info('🎉 所有测试执行完成！');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('❌ 测试套件执行失败:', error);
    process.exit(1);
  }
}

main();
