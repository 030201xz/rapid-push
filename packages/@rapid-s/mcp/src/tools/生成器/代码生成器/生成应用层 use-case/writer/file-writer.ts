/**
 * 文件写入器
 *
 * 负责将生成的代码写入文件系统
 * - 自动创建目录
 * - 代码格式化
 * - 错误处理
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { IRFileToWrite, IRWriteResult } from "../core/ir";
import { formatCode } from "./formatter";
import { createLogger } from "@/shared";

const log = createLogger("tool:use-case-generator:writer");

// ============================================================================
// 文件写入器实现
// ============================================================================

export class FileWriter {
  /**
   * 批量写入文件
   *
   * @param files - 待写入的文件列表
   * @returns 写入结果列表
   */
  async writeAll(files: IRFileToWrite[]): Promise<IRWriteResult[]> {
    const results: IRWriteResult[] = [];

    for (const file of files) {
      const result = await this.writeOne(file);
      results.push(result);
    }

    return results;
  }

  /**
   * 写入单个文件
   */
  private async writeOne(file: IRFileToWrite): Promise<IRWriteResult> {
    const { path, content, type } = file;

    try {
      // 确保目录存在
      await mkdir(dirname(path), { recursive: true });

      // 格式化代码
      const formattedContent = await formatCode(content, path);

      // 写入文件
      await writeFile(path, formattedContent, "utf-8");

      log.debug(`✅ 写入成功: ${path}`);

      return {
        path,
        type,
        success: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`❌ 写入失败 ${path}: ${errorMessage}`);

      return {
        path,
        type,
        success: false,
        error: errorMessage,
      };
    }
  }
}
