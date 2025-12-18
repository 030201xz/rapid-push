/**
 * 工具名称类型生成器
 * 启动时自动扫描工具文件（支持嵌套目录），生成类型定义到 .base-mcp 目录
 */

import { Glob } from 'bun';
import { dirname, join } from 'node:path';
import { createLogger } from '../shared/logger.ts';

const log = createLogger('tool-scanner');

/** 工具信息 */
interface ToolInfo {
  /** 类名，如 EvalTool */
  className: string;
  /** 工具名称，如 decimal_eval */
  name: string;
  /** 标题，如 高精度表达式计算 */
  title: string;
  /** 相对路径，如 math/eval.ts */
  relativePath: string;
}

/** 项目根目录 */
const PROJECT_ROOT = join(dirname(import.meta.path), '../..');

/** 工具目录 */
const TOOLS_DIR = join(PROJECT_ROOT, 'src/tools');

/** 生成目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, '.skills-mcp');

/** 输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'tool-names.ts');

/**
 * 从工具文件提取信息
 * @param filePath 绝对文件路径
 * @param relativePath 相对于 tools 目录的路径
 */
async function extractToolInfo(
  filePath: string,
  relativePath: string,
): Promise<ToolInfo | null> {
  const content = await Bun.file(filePath).text();

  // 匹配类名（以 Tool 结尾）
  const classMatch = content.match(/export\s+class\s+(\w+Tool)\s+extends/);
  if (!classMatch) return null;

  // 匹配 getOptions 返回的 name 和 title
  const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
  const titleMatch = content.match(/title:\s*["']([^"']+)["']/);

  const className = classMatch[1];
  const name = nameMatch?.[1];
  if (!className || !name) return null;

  return {
    className,
    name,
    title: titleMatch?.[1] ?? name,
    relativePath,
  };
}

/**
 * 扫描所有工具并生成类型定义文件
 * 支持嵌套目录结构，如 tools/math/eval.ts
 */
export async function generateToolNames(): Promise<string[]> {
  // 使用 **/*.ts 递归扫描所有嵌套目录
  const glob = new Glob('**/*.ts');
  const tools: ToolInfo[] = [];

  // 扫描所有工具文件（包括子目录）
  for await (const relativePath of glob.scan(TOOLS_DIR)) {
    // 跳过 index.ts 和其他非工具文件
    const fileName = relativePath.split('/').pop() ?? '';
    if (fileName === 'index.ts' || fileName.startsWith('_')) continue;

    const info = await extractToolInfo(
      join(TOOLS_DIR, relativePath),
      relativePath,
    );
    if (info) {
      tools.push(info);
    }
  }

  // 按名称排序
  tools.sort((a, b) => a.name.localeCompare(b.name));

  // 生成常量名（decimal_eval -> DECIMAL_EVAL）
  const toConstName = (name: string) => name.toUpperCase();

  // 生成文件内容
  const content = `/**
 * ⚠️ 此文件由启动时自动生成，请勿手动修改！
 */

/** 所有工具名称常量 */
export const TOOL_NAMES = {
${tools
  .map(t => `  /** ${t.title} */\n  ${toConstName(t.name)}: "${t.name}"`)
  .join(',\n')},
} as const;

/** 工具名称类型（用于类型安全的配置） */
export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

/** 所有工具名称数组 */
export const ALL_TOOL_NAMES = Object.values(TOOL_NAMES) as ToolName[];
`;

  // 确保目录存在
  await Bun.write(OUTPUT_FILE, content);

  const toolNames = tools.map(t => t.name);
  log.debug(`已生成工具名称类型: ${toolNames.join(', ')}`);

  return toolNames;
}
