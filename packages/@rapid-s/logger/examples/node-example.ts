/**
 * @x/logger 示例 - Node.js/Bun 终端环境
 */

import logger, { createLogger, LogLevel } from '../index';

console.log('\n=== 基础日志输出 ===\n');
logger.trace('这是 trace 级别日志');
logger.debug('这是 debug 级别日志');
logger.info('这是 info 级别日志');
logger.warn('这是 warn 级别日志');
logger.error('这是 error 级别日志');
logger.fatal('这是 fatal 级别日志');

console.log('\n=== 带上下文数据的日志 ===\n');
logger.info('用户登录', { 
  userId: 123, 
  username: 'john_doe',
  ip: '192.168.1.1',
  timestamp: new Date()
});

logger.error('API 请求失败', {
  endpoint: '/api/users',
  status: 500,
  error: 'Internal Server Error'
});

console.log('\n=== 子 Logger (命名空间) ===\n');
const apiLogger = logger.child('API');
const dbLogger = logger.child('Database');

apiLogger.info('收到 GET 请求');
apiLogger.debug('请求参数验证通过');
dbLogger.info('执行 SQL 查询');
dbLogger.debug('查询返回 10 条结果');

console.log('\n=== 嵌套命名空间 ===\n');
const userApi = apiLogger.child('User');
userApi.info('创建新用户');
userApi.debug('用户数据已保存');

console.log('\n=== 自定义配置 ===\n');
const customLogger = createLogger({
  level: 'debug',
  format: 'pretty',
  timestamp: true,
  color: true,
  namespace: 'CustomApp'
});

customLogger.debug('自定义 logger 调试信息');
customLogger.info('自定义 logger 普通信息');

console.log('\n=== 设置日志级别 ===\n');
const testLogger = createLogger({ level: 'warn' });
console.log('当前级别: WARN (只显示 WARN 及以上)');
testLogger.debug('这条不会显示');
testLogger.info('这条也不会显示');
testLogger.warn('这条会显示');
testLogger.error('这条也会显示');

console.log('\n=== JSON 格式输出 ===\n');
const jsonLogger = createLogger({
  format: 'json',
  namespace: 'JsonApp'
});

jsonLogger.info('JSON 格式日志', { userId: 456, action: 'login' });

console.log('\n=== 性能计时 ===\n');
logger.time('数据处理');
// 模拟耗时操作
await new Promise(resolve => setTimeout(resolve, 100));
logger.timeEnd('数据处理');

console.log('\n=== 日志分组 ===\n');
logger.group('用户详情');
logger.info('姓名: 张三');
logger.info('年龄: 30');
logger.info('邮箱: zhangsan@example.com');
logger.groupEnd();

console.log('\n=== 动态修改配置 ===\n');
const dynamicLogger = createLogger({ level: 'info', color: true });
dynamicLogger.debug('这条不会显示 (当前级别: INFO)');
dynamicLogger.info('这条会显示');

dynamicLogger.setLevel('debug');
console.log('级别已修改为: DEBUG');
dynamicLogger.debug('现在这条会显示了');

console.log('\n=== 完成 ===\n');
