/**
 * 灰度发布测试套件 - 运行所有测试
 *
 * 测试场景：
 * 1. 初始化环境（组织、项目、渠道）
 * 2. 上传更新（50% 灰度）
 * 3. 创建灰度规则（设备白名单 + 百分比）
 * 4. 测试灰度匹配逻辑
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/run-all.ts
 */

import { execSync } from 'node:child_process';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('GrayRelease:RunAll');

/** 测试步骤列表 */
const TEST_STEPS = [
  '00-setup.ts',
  '01-upload.ts',
  '02-create-rules.ts',
  '03-test-rollout.ts',
  '99-cleanup.ts',
] as const;

/** 执行单个测试步骤 */
async function runStep(stepFile: string): Promise<void> {
  const stepPath = `src/modules/hot-update/__test__/apis/01-gray-release-灰度发布测试/${stepFile}`;

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
  logger.info('\n🚀 开始运行灰度发布完整测试流程\n');

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
