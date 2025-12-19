/**
 * 代码签名测试 - 完整测试套件
 *
 * 测试内容：
 * - 顺序执行所有代码签名测试步骤
 * - 验证代码签名功能的完整流程
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/03-signing-代码签名测试/run-all.ts
 */

import { spawnSync } from 'node:child_process';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('Signing:RunAll');

/** 测试步骤配置 */
const TEST_STEPS = [
  {
    step: '00',
    name: '环境初始化',
    file: '00-setup.ts',
  },
  {
    step: '01',
    name: '配置代码签名',
    file: '01-configure-signing.ts',
  },
  {
    step: '02',
    name: '上传签名更新',
    file: '02-upload-signed.ts',
  },
  {
    step: '03',
    name: '验证签名',
    file: '03-check-signature.ts',
  },
  {
    step: '99',
    name: '清理测试数据',
    file: '99-cleanup.ts',
  },
] as const;

/** 执行单个测试步骤 */
function runStep(file: string): boolean {
  const result = spawnSync(
    'bun',
    [
      'run',
      `src/modules/hot-update/__test__/apis/03-signing-代码签名测试/${file}`,
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
  logger.info('🔐 代码签名测试 - 完整测试套件');
  logger.info('='.repeat(70));

  let totalSteps = TEST_STEPS.length;
  let passedSteps = 0;

  for (const { step, name, file } of TEST_STEPS) {
    logger.info(`\n[${'▶'.repeat(3)}] 步骤 ${step}: ${name}`);
    logger.info('-'.repeat(70));

    const success = runStep(file);

    if (!success) {
      logger.error(`\n❌ 步骤 ${step} 失败: ${name}`);
      logger.error('测试套件中断');
      process.exit(1);
    }

    passedSteps++;
    logger.info(`\n✅ 步骤 ${step} 通过: ${name}`);
  }

  logger.info('\n' + '='.repeat(70));
  logger.info('🎉 代码签名测试套件执行完成！');
  logger.info('='.repeat(70));

  logger.info(`\n测试统计:`);
  logger.info(`  - 总步骤数: ${totalSteps}`);
  logger.info(`  - 通过步骤: ${passedSteps}`);
  logger.info(`  - 失败步骤: ${totalSteps - passedSteps}`);

  logger.info('\n✅ 代码签名功能测试通过！');
  logger.info('\n测试场景:');
  logger.info('  1. ✅ 生成 RSA 密钥对');
  logger.info('  2. ✅ 配置 Channel 公钥');
  logger.info('  3. ✅ 上传签名更新');
  logger.info('  4. ✅ 验证签名正确性');
  logger.info('  5. ✅ 代码签名功能正常');
}

main().catch(err => {
  logger.error('测试套件执行失败:', err);
  process.exit(1);
});
