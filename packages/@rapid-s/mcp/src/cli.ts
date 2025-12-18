#!/usr/bin/env bun
/**
 * Skills MCP CLI
 *
 * 用法:
 *   bunx x-skills-mcp dev        # 开发模式（watch）
 *   bunx x-skills-mcp start      # 启动 MCP 服务器
 *   bunx x-skills-mcp server     # 启动 Web 服务器
 *   bunx x-skills-mcp build      # 构建
 */

import { spawn } from 'bun';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 获取包根目录（cli.ts 在 src/ 下，所以需要上一级）
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = join(__dirname, '..');

const COMMANDS: Record<
  string,
  { script: string; watch?: boolean; description: string }
> = {
  dev: {
    script: 'src/index.ts',
    watch: true,
    description: '开发模式（watch）',
  },
  start: {
    script: 'src/index.ts',
    description: '启动 MCP 服务器',
  },
  server: {
    script: 'src/server/index.ts',
    description: '启动 Web 服务器',
  },
  'dev:server': {
    script: 'src/server/index.ts',
    watch: true,
    description: '开发模式启动 Web 服务器',
  },
};

function showHelp(): void {
  console.log(`
\x1b[36m@x/skills-mcp CLI\x1b[0m

\x1b[33m用法:\x1b[0m
  bunx x-skills-mcp <command>

\x1b[33m命令:\x1b[0m
${Object.entries(COMMANDS)
  .map(
    ([cmd, { description }]) =>
      `  \x1b[32m${cmd.padEnd(12)}\x1b[0m ${description}`
  )
  .join('\n')}

\x1b[33m示例:\x1b[0m
  bunx x-skills-mcp dev           # 开发模式
  bunx x-skills-mcp start         # 启动服务
  bun x-skills-mcp dev            # 从 monorepo 根目录运行

\x1b[33m环境变量:\x1b[0m
  SKILLS_MCP_TOOLS_PATH           # 外部工具目录路径
  ENABLE_WEB_SERVER               # 是否启用 Web 服务器 (默认 true)
`);
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2);

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const config = COMMANDS[command];
  if (!config) {
    console.error(`\x1b[31m错误: 未知命令 "${command}"\x1b[0m`);
    showHelp();
    process.exit(1);
  }

  const scriptPath = join(PKG_ROOT, config.script);
  const args = config.watch
    ? ['--watch', 'run', scriptPath]
    : ['run', scriptPath];

  // 保存用户运行命令时的工作目录
  const userCwd = process.cwd();

  // 处理 SKILLS_MCP_TOOLS_PATH 相对路径 - 相对于用户运行命令的目录
  let toolsPath = process.env.SKILLS_MCP_TOOLS_PATH;
  if (toolsPath && !toolsPath.startsWith('/')) {
    toolsPath = join(userCwd, toolsPath);
  }

  console.log(`\x1b[36m▶ 运行: bun ${args.join(' ')}\x1b[0m\n`);

  const proc = spawn(['bun', ...args], {
    cwd: PKG_ROOT,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      ...process.env,
      // 如果有外部工具路径，使用解析后的绝对路径
      ...(toolsPath ? { SKILLS_MCP_TOOLS_PATH: toolsPath } : {}),
    },
  });

  const exitCode = await proc.exited;
  process.exit(exitCode);
}

main();
