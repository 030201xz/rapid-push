#!/usr/bin/env bun

/**
 * 快速测试脚本
 */

import logger from './index';

console.log('\n🚀 测试 @x/logger\n');

logger.info('Hello from @x/logger!');
logger.debug('调试信息');
logger.warn('警告信息');
logger.error('错误信息', { code: 500 });

const apiLogger = logger.child('API');
apiLogger.info('子 logger 测试');

console.log('\n✅ 测试完成\n');
