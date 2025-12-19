/**
 * 压缩支持测试套件 - 运行所有测试
 *
 * 测试场景：
 * 1. 初始化环境（组织、项目、渠道）
 * 2. 上传资源
 * 3. 测试 gzip 压缩响应
 * 4. 测试无压缩响应
 * 5. 清理测试数据
 *
 * 运行: bun run src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/run-all.ts
 */

import { execSync } from 'node:child_process';
import { createTestLogger } from '../_shared';

const logger = createTestLogger('Compression:RunAll');

/** 测试步骤配置 */
const TEST_STEPS = [
  { file: '00-setup.ts', name: '环境初始化' },
  { file: '01-upload-asset.ts', name: '上传资源' },
  { file: '02-test-gzip.ts', name: '测试 gzip 压缩' },
  { file: '03-test-no-compression.ts', name: '测试无压缩响应' },
  { file: '99-cleanup.ts', name: '清理测试数据' },
] as const;

/** 测试统计 */
interface TestStats {
  total: number;
  passed: number;
  failed: number;
}

/** 执行单个测试步骤 */
async function runStep(
  stepFile: string,
  stepName: string
): Promise<boolean> {
  const stepPath = `src/modules/hot-update/__test__/apis/05-compression-压缩支持测试/${stepFile}`;

  try {
    execSync(`bun run ${stepPath}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  logger.info('='.repeat(68));
  logger.info('🗜️ 压缩支持测试 - 完整测试套件');
  logger.info('='.repeat(68));

  const stats: TestStats = {
    total: TEST_STEPS.length,
    passed: 0,
    failed: 0,
  };

  // 执行所有测试步骤
  for (const step of TEST_STEPS) {
    logger.info(
      `\n[▶▶▶] 步骤 ${step.file.split('-')[0]}: ${step.name}`
    );
    logger.info('-'.repeat(68));

    const success = await runStep(step.file, step.name);

    if (success) {
      stats.passed++;
      logger.info(
        `\n✅ 步骤 ${step.file.split('-')[0]} 通过: ${step.name}`
      );
    } else {
      stats.failed++;
      logger.error(
        `\n❌ 步骤 ${step.file.split('-')[0]} 失败: ${step.name}`
      );
      logger.error('测试套件中断');
      break;
    }
  }

  // 输出测试结果
  logger.info('\n' + '='.repeat(70));

  if (stats.failed === 0) {
    logger.info('🎉 压缩支持测试套件执行完成！');
    logger.info('='.repeat(68));
    logger.info('\n测试统计:');
    logger.info(`  - 总步骤数: ${stats.total}`);
    logger.info(`  - 通过步骤: ${stats.passed}`);
    logger.info(`  - 失败步骤: ${stats.failed}`);

    logger.info('\n✅ 压缩功能测试通过！');

    logger.info('\n测试场景:');
    logger.info('  1. ✅ 服务端支持 gzip 压缩');
    logger.info('  2. ✅ 正确设置 Content-Encoding 响应头');
    logger.info('  3. ✅ 正确设置 Vary 响应头');
    logger.info('  4. ✅ 压缩数据可正确解压');
    logger.info('  5. ✅ 不请求压缩时返回原始数据');
    logger.info('  6. ✅ 符合 Expo Updates v1 协议规范');
  } else {
    logger.error('❌ 压缩支持测试套件执行失败');
    logger.info('='.repeat(68));
    logger.info('\n测试统计:');
    logger.info(`  - 总步骤数: ${stats.total}`);
    logger.info(`  - 通过步骤: ${stats.passed}`);
    logger.info(`  - 失败步骤: ${stats.failed}`);
    process.exit(1);
  }
}

main().catch(err => {
  logger.error('测试套件执行失败:', err);
  process.exit(1);
});
