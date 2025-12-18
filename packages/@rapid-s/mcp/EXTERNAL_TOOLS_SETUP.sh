#!/usr/bin/env bash
# Skills MCP 外部工具集成示例

# 方案一：直接指定外部工具目录
export SKILLS_MCP_TOOLS_PATH="/home/xz/Projects/030201xy/wf/.skills-mcp/tools"
bun run src/index.ts

# 方案二：多个目录（使用绝对路径）
# export SKILLS_MCP_TOOLS_PATH="/path/to/tools1:/path/to/tools2"
# 注意：当前实现只支持单个目录，如需多目录可扩展 scanAndLoadTools

echo "✓ MCP 服务器已启动，外部工具已加载"
