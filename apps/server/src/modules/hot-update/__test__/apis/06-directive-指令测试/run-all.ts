/**
 * 指令测试 - 完整测试套件
 *
 * 测试内容：
 * - 顺序执行所有指令测试步骤
 * - 验证指令功能的完整流程
 *
 * 测试场景：
 * 1. 初始化环境（组织、项目、渠道、初始更新）
 * 2. 创建 rollBackToEmbedded 指令
 * 3. 验证客户端收到指令
 * 4. 停用指令
 * 5. 测试指令过期功能
 * 6. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/06-directive-指令测试/run-all.ts
 */

import { spawnSync } from 'node:child_process';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('Directive:RunAll');

/** 测试步骤配置 */
const TEST_STEPS = [
  {
    step: '00',
    name: '环境初始化',
    file: '00-setup.ts',
  },
  {
    step: '01',
    name: '创建 rollBackToEmbedded 指令',
    file: '01-create-directive.ts',
  },
  {
    step: '02',
    name: '验证客户端收到指令',
    file: '02-verify-directive.ts',
  },
  {
    step: '03',
    name: '停用指令',
    file: '03-deactivate-directive.ts',
  },
  {
    step: '04',
    name: '测试指令过期功能',
    file: '04-expiry-directive.ts',
  },
  {
    step: '99',
    name: '清理测试数据',
    file: '99-cleanup.ts',
  },
] as const;

/** 测试统计 */
interface TestStats {
  total: number;
  passed: number;
  failed: number;
}

/** 执行单个测试步骤 */
function runStep(file: string): boolean {
  const result = spawnSync(
    'bun',
    [
      'run',
      `src/modules/hot-update/__test__/apis/06-directive-指令测试/${file}`,
    ],
    {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    }
  );
  return result.status === 0;
}

async function main() {
  logger.info('='.repeat(70));
  logger.info('📜 指令测试 - 完整测试套件');
  logger.info('='.repeat(70));

  const stats: TestStats = {
    total: TEST_STEPS.length,
    passed: 0,
    failed: 0,
  };

  // 执行所有测试步骤
  for (const { step, name, file } of TEST_STEPS) {
    logger.info(`\n[${'▶'.repeat(3)}] 步骤 ${step}: ${name}`);
    logger.info('-'.repeat(70));

    const success = runStep(file);

    if (!success) {
      stats.failed++;
      logger.error(`\n❌ 步骤 ${step} 失败: ${name}`);
      logger.error('测试套件中断');

      // 尝试清理
      logger.info('\n🧹 尝试清理测试数据...');
      runStep('99-cleanup.ts');

      process.exit(1);
    }

    stats.passed++;
    logger.info(`\n✅ 步骤 ${step} 通过: ${name}`);
  }

  // 输出测试结果
  logger.info('\n' + '='.repeat(70));
  logger.info('🎉 指令测试套件执行完成！');
  logger.info('='.repeat(70));

  logger.info('\n📊 测试统计:');
  logger.info(`  - 总步骤数: ${stats.total}`);
  logger.info(`  - 通过步骤: ${stats.passed}`);
  logger.info(`  - 失败步骤: ${stats.failed}`);

  logger.info('\n✅ 指令功能测试通过！');

  logger.info('\n📋 测试场景:');
  logger.info('  1. ✅ 创建 rollBackToEmbedded 指令');
  logger.info('  2. ✅ 客户端正确收到 rollback 响应');
  logger.info('  3. ✅ 指令优先于更新返回');
  logger.info('  4. ✅ runtimeVersion 精确匹配');
  logger.info('  5. ✅ 停用指令后客户端恢复正常');
  logger.info('  6. ✅ 指令过期后自动失效');
  logger.info('  7. ✅ 符合 Expo Updates v1 协议规范');

  logger.info('\n💡 支持的指令类型:');
  logger.info('  - rollBackToEmbedded: 回滚到应用内嵌版本');
  logger.info('  - noUpdateAvailable: 无可用更新（预留）');
}

main().catch(err => {
  logger.error('测试套件执行失败:', err);
  process.exit(1);
});
