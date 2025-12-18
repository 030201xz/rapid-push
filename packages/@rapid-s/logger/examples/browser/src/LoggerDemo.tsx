import { useState, useEffect, useRef } from 'react';
import logger, { createLogger } from '@x/logger/browser';
import type { LogLevel } from '@x/logger/browser';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  context?: any;
  timestamp: string;
  namespace?: string;
}

const LEVEL_COLORS = {
  TRACE: { bg: 'bg-gray-500', text: 'text-gray-100', badge: '🔍' },
  DEBUG: { bg: 'bg-blue-500', text: 'text-blue-100', badge: '🐛' },
  INFO: { bg: 'bg-green-500', text: 'text-green-100', badge: 'ℹ️' },
  WARN: { bg: 'bg-orange-500', text: 'text-orange-100', badge: '⚠️' },
  ERROR: { bg: 'bg-red-500', text: 'text-red-100', badge: '❌' },
  FATAL: { bg: 'bg-red-900', text: 'text-red-100', badge: '💀' },
};

export function LoggerDemo() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logLevel, setLogLevel] = useState<string>('info');
  const [showTimestamp, setShowTimestamp] = useState(true);
  const [showContext, setShowContext] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 拦截 console 方法来捕获日志
  useEffect(() => {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    const addLog = (level: string, args: any[]) => {
      const message = args[0];
      const context = args[1];
      
      const logEntry: LogEntry = {
        id: Date.now().toString() + Math.random(),
        level,
        message: typeof message === 'string' ? message : JSON.stringify(message),
        context,
        timestamp: new Date().toLocaleTimeString('zh-CN', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          fractionalSecondDigits: 3 
        }),
      };

      setLogs(prev => [...prev, logEntry]);
    };

    console.log = (...args) => {
      originalLog(...args);
      if (args[0]?.includes?.('%c')) {
        // 解析带样式的日志
        const matches = args[0].match(/🔍|🐛|ℹ️|⚠️|❌|💀/);
        if (matches) {
          const emoji = matches[0];
          const levelMap: Record<string, string> = {
            '🔍': 'TRACE',
            '🐛': 'DEBUG', 
            'ℹ️': 'INFO',
            '⚠️': 'WARN',
            '❌': 'ERROR',
            '💀': 'FATAL',
          };
          const level = levelMap[emoji] || 'INFO';
          
          // 提取消息和上下文
          const parts = args[0].split('%c');
          const message = parts[parts.length - 1]?.trim() || '';
          const context = args[args.length - 1];
          const hasContext = typeof context === 'object' && !Array.isArray(context);
          
          addLog(level, [message, hasContext ? context : undefined]);
        }
      }
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('INFO', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('WARN', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('ERROR', args);
    };

    console.debug = (...args) => {
      originalDebug(...args);
      addLog('DEBUG', args);
    };

    return () => {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
      console.debug = originalDebug;
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearLogs = () => {
    setLogs([]);
  };

  const handleLogLevelChange = (level: string) => {
    setLogLevel(level);
    logger.setLevel(level as any);
  };

  // 测试函数
  const testBasicLogs = () => {
    logger.trace('这是 trace 级别日志');
    logger.debug('这是 debug 级别日志');
    logger.info('这是 info 级别日志');
    logger.warn('这是 warn 级别日志');
    logger.error('这是 error 级别日志');
    logger.fatal('这是 fatal 级别日志');
  };

  const testWithContext = () => {
    logger.info('用户登录成功', { 
      userId: 12345, 
      username: 'john_doe',
      ip: '192.168.1.1',
      timestamp: new Date().toISOString()
    });

    logger.error('API 请求失败', {
      endpoint: '/api/users',
      status: 500,
      error: 'Internal Server Error',
      retryCount: 3
    });
  };

  const testNamespace = () => {
    const apiLogger = logger.child('API');
    const uiLogger = logger.child('UI');
    
    apiLogger.info('收到 GET 请求');
    apiLogger.debug('请求参数验证通过');
    uiLogger.info('渲染组件');
    uiLogger.warn('组件渲染耗时过长');
  };

  const testNestedNamespace = () => {
    const appLogger = logger.child('App');
    const userModule = appLogger.child('User');
    const authModule = appLogger.child('Auth');
    
    userModule.info('获取用户信息');
    authModule.warn('令牌即将过期');
    userModule.debug('用户数据已缓存');
  };

  const testPerformance = async () => {
    logger.time('数据加载');
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.timeEnd('数据加载');
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">@x/logger 浏览器演示</h1>
        <p className="text-gray-600">实时日志展示和测试</p>
      </div>

      {/* 控制面板 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 日志级别选择 */}
          <div>
            <label className="block text-sm font-medium mb-2">日志级别</label>
            <div className="flex flex-wrap gap-2">
              {['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'].map(level => (
                <button
                  key={level}
                  onClick={() => handleLogLevelChange(level)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    logLevel === level
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* 显示选项 */}
          <div>
            <label className="block text-sm font-medium mb-2">显示选项</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showTimestamp}
                  onChange={(e) => setShowTimestamp(e.target.checked)}
                  className="mr-2"
                />
                显示时间戳
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showContext}
                  onChange={(e) => setShowContext(e.target.checked)}
                  className="mr-2"
                />
                显示上下文数据
              </label>
            </div>
          </div>
        </div>

        {/* 测试按钮 */}
        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">测试功能</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testBasicLogs}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              测试基础日志
            </button>
            <button
              onClick={testWithContext}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              测试带上下文
            </button>
            <button
              onClick={testNamespace}
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
            >
              测试命名空间
            </button>
            <button
              onClick={testNestedNamespace}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors"
            >
              测试嵌套命名空间
            </button>
            <button
              onClick={testPerformance}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              测试性能计时
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors ml-auto"
            >
              清空日志
            </button>
          </div>
        </div>
      </div>

      {/* 日志显示区域 */}
      <div className="bg-gray-900 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">日志输出</h2>
          <span className="text-gray-400 text-sm">{logs.length} 条日志</span>
        </div>

        <div className="bg-black rounded-md p-4 h-96 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              暂无日志,点击上方按钮测试功能
            </div>
          ) : (
            logs.map((log) => {
              const colorConfig = LEVEL_COLORS[log.level as keyof typeof LEVEL_COLORS] || LEVEL_COLORS.INFO;
              
              return (
                <div key={log.id} className="mb-2 pb-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-start gap-2">
                    {/* Badge */}
                    <span className={`${colorConfig.bg} ${colorConfig.text} px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 shrink-0`}>
                      <span>{colorConfig.badge}</span>
                      <span>{log.level}</span>
                    </span>

                    {/* 时间戳 */}
                    {showTimestamp && (
                      <span className="text-gray-500 text-xs shrink-0">
                        {log.timestamp}
                      </span>
                    )}

                    {/* 命名空间 */}
                    {log.namespace && (
                      <span className="text-cyan-400 text-xs shrink-0">
                        [{log.namespace}]
                      </span>
                    )}

                    {/* 消息 */}
                    <span className="text-gray-300 flex-1">
                      {log.message}
                    </span>
                  </div>

                  {/* 上下文数据 */}
                  {showContext && log.context && (
                    <div className="mt-2 ml-6 text-gray-400 text-xs">
                      <pre className="bg-gray-800 rounded p-2 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-2">使用说明</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>选择不同的日志级别查看过滤效果(只显示该级别及以上的日志)</li>
          <li>点击测试按钮体验不同的日志功能</li>
          <li>可以切换显示/隐藏时间戳和上下文数据</li>
          <li>在浏览器控制台中也能看到原始的彩色日志输出</li>
          <li>支持命名空间(子 logger)和嵌套命名空间</li>
        </ul>
      </div>
    </div>
  );
}
