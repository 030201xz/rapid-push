/**
 * 文件写入器
 *
 * 负责将生成的代码写入文件系统
 */
import * as fs from "node:fs";
import * as path from "node:path";

import type { GeneratedFileInfo, GeneratedFileStatus, GeneratedFileType } from "../types";

// ============================================================================
// 写入选项
// ============================================================================

/**
 * 写入选项
 */
export interface WriteOptions {
  /** 是否覆盖已存在文件 */
  overwrite: boolean;
  /** 文件后缀 */
  suffix: string;
  /** 预览模式 */
  dryRun: boolean;
}

/**
 * 默认写入选项
 */
export const DEFAULT_WRITE_OPTIONS: WriteOptions = {
  overwrite: false,
  suffix: ".keep",
  dryRun: false,
};

// ============================================================================
// 文件信息
// ============================================================================

/**
 * 待写入文件
 */
export interface FileToWrite {
  /** 相对路径（不含 suffix） */
  relativePath: string;
  /** 文件内容 */
  content: string;
  /** 文件类型 */
  type: GeneratedFileType;
  /** 关联的方法名 */
  methodName?: string;
}

// ============================================================================
// 文件写入器
// ============================================================================

/**
 * 写入单个文件
 */
export function writeFile(
  outputPath: string,
  file: FileToWrite,
  options: WriteOptions
): GeneratedFileInfo {
  // 添加后缀
  const finalRelativePath = `${file.relativePath}${options.suffix}`;
  const fullPath = path.join(outputPath, finalRelativePath);

  // 确定状态
  let status: GeneratedFileStatus;
  const exists = fs.existsSync(fullPath);

  if (exists && !options.overwrite) {
    status = "skipped";
  } else if (exists && options.overwrite) {
    status = "overwritten";
  } else {
    status = "created";
  }

  // 如果不是跳过，且不是预览模式，则写入文件
  if (status !== "skipped" && !options.dryRun) {
    // 确保目录存在
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(fullPath, file.content, "utf-8");
  }

  return {
    filePath: fullPath,
    type: file.type,
    status,
    methodName: file.methodName,
  };
}

/**
 * 批量写入文件
 */
export function writeFiles(
  outputPath: string,
  files: FileToWrite[],
  options: Partial<WriteOptions> = {}
): GeneratedFileInfo[] {
  const finalOptions: WriteOptions = {
    ...DEFAULT_WRITE_OPTIONS,
    ...options,
  };

  // 确保输出目录存在
  if (!finalOptions.dryRun && !fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  return files.map((file) => writeFile(outputPath, file, finalOptions));
}

/**
 * 检查目录是否可写
 */
export function isWritable(dirPath: string): boolean {
  try {
    // 如果目录不存在，检查父目录
    if (!fs.existsSync(dirPath)) {
      const parent = path.dirname(dirPath);
      if (!fs.existsSync(parent)) {
        return false;
      }
      fs.accessSync(parent, fs.constants.W_OK);
      return true;
    }

    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
