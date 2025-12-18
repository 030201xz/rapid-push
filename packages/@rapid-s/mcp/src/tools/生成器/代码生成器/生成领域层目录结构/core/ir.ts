/**
 * Domain Scaffold Generator - 中间表示层 (IR)
 *
 * 定义内部数据模型，用于解耦输入解析和代码生成
 */

import type { FileType } from "../types";

// ============================================================================
// 文件 IR
// ============================================================================

/**
 * 待生成的文件 IR
 */
export interface IRFileToWrite {
  /** 完整文件路径（含 .keep 后缀） */
  path: string;
  /** 原始文件名（不含 .keep） */
  filename: string;
  /** 文件类型 */
  type: FileType;
  /** 所属聚合名称 */
  aggregate?: string;
  /** 所属子域名称 */
  subdomain: string;
  /** 所属层级 */
  layer: string;
  /** 文件描述 */
  description?: string;
  /** 类名（从文件名推导） */
  className?: string;
}

/**
 * 文件写入结果
 */
export interface IRWriteResult {
  /** 文件路径 */
  path: string;
  /** 文件类型 */
  type: FileType;
  /** 是否成功 */
  success: boolean;
  /** 是否新创建（false 表示已存在被跳过） */
  created: boolean;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 聚合 IR
// ============================================================================

/**
 * 聚合信息 IR
 */
export interface IRAggregateInfo {
  /** 聚合名称 */
  name: string;
  /** 聚合描述 */
  description?: string;
  /** 所属子域 */
  subdomain: string;
  /** 所属层级 */
  layer: string;
  /** 聚合基础路径 */
  basePath: string;
  /** 待生成的文件列表 */
  files: IRFileToWrite[];
}

// ============================================================================
// 子域 IR
// ============================================================================

/**
 * 子域层级 IR
 */
export interface IRLayerInfo {
  /** 层级名称 */
  name: string;
  /** 聚合列表 */
  aggregates: IRAggregateInfo[];
  /** 领域服务文件 */
  services: IRFileToWrite[];
  /** 异常文件 */
  exceptions: IRFileToWrite[];
}

/**
 * 子域信息 IR
 */
export interface IRSubdomainInfo {
  /** 子域名称 */
  name: string;
  /** 子域类型 */
  type: string;
  /** 子域描述 */
  description?: string;
  /** 层级列表 */
  layers: IRLayerInfo[];
}

// ============================================================================
// 生成计划 IR
// ============================================================================

/**
 * 生成选项
 */
export interface IRGenerationOptions {
  /** 占位文件后缀 */
  placeholderSuffix: string;
  /** 是否覆盖已存在文件 */
  overwrite: boolean;
}

/**
 * 完整生成计划 IR
 */
export interface IRGenerationPlan {
  /** 输出基础路径 */
  outputPath: string;
  /** 上下文名称 */
  contextName: string;
  /** 子域列表 */
  subdomains: IRSubdomainInfo[];
  /** 生成选项 */
  options: IRGenerationOptions;
  /** 所有待写入的文件（扁平化） */
  allFiles: IRFileToWrite[];
}
