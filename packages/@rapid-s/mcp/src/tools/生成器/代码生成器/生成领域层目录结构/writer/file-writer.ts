/**
 * Domain Scaffold Generator - 文件写入器
 *
 * 负责将生成的内容写入文件系统
 */

import { dirname } from "node:path";
import { exists, mkdir } from "node:fs/promises";

import type { IRWriteResult } from "../core/ir";

/**
 * 待写入的文件
 */
export interface FileToWrite {
  /** 文件路径（已含 .keep 后缀） */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: string;
}

/**
 * 写入选项
 */
export interface WriteOptions {
  /** 是否覆盖已存在的文件 */
  overwrite: boolean;
}

/**
 * 文件写入器
 */
export class FileWriter {
  /** 已创建的目录缓存 */
  private createdDirs = new Set<string>();

  /**
   * 批量写入文件
   */
  async writeAll(
    files: FileToWrite[],
    options: WriteOptions
  ): Promise<IRWriteResult[]> {
    const results: IRWriteResult[] = [];

    for (const file of files) {
      const result = await this.writeFile(file, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 写入单个文件
   */
  private async writeFile(
    file: FileToWrite,
    options: WriteOptions
  ): Promise<IRWriteResult> {
    try {
      // 确保目录存在
      const dir = dirname(file.path);
      await this.ensureDir(dir);

      // 检查文件是否存在
      const fileExists = await exists(file.path);

      if (fileExists && !options.overwrite) {
        // 文件已存在且不覆盖，跳过
        return {
          path: file.path,
          type: file.type as IRWriteResult["type"],
          success: true,
          created: false,
        };
      }

      // 写入文件
      await Bun.write(file.path, file.content);

      return {
        path: file.path,
        type: file.type as IRWriteResult["type"],
        success: true,
        created: true,
      };
    } catch (error) {
      return {
        path: file.path,
        type: file.type as IRWriteResult["type"],
        success: false,
        created: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDir(dir: string): Promise<void> {
    if (this.createdDirs.has(dir)) {
      return;
    }

    const dirExists = await exists(dir);
    if (!dirExists) {
      await mkdir(dir, { recursive: true });
    }

    this.createdDirs.add(dir);
  }

  /**
   * 获取创建的目录数量
   */
  getCreatedDirsCount(): number {
    return this.createdDirs.size;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.createdDirs.clear();
  }
}
