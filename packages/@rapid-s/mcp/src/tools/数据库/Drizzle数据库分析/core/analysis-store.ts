/**
 * 分析上下文状态管理
 *
 * 类似 zustand 的设计，提供全局状态共享：
 * - 已分析的表信息
 * - 变量名到表名的映射
 * - 外键引用解析
 */

import type { ColumnInfo, IndexInfo, TableInfo, TypeExportInfo } from "../types";

// ============================================================================
// 状态类型定义
// ============================================================================

/**
 * 表注册信息（轻量级，用于外键解析）
 */
export interface TableRegistry {
  /** 数据库表名 */
  tableName: string;
  /** 代码变量名 */
  variableName: string;
  /** 文件路径 */
  filePath: string;
  /** 字段名列表（用于外键字段验证） */
  columnNames: string[];
}

/**
 * 待解析的外键引用
 */
export interface PendingReference {
  /** 所属表变量名 */
  tableVariable: string;
  /** 所属字段名 */
  columnName: string;
  /** 引用的表变量名 */
  referencedTableVariable: string;
  /** 引用的字段名 */
  referencedColumnName: string;
  /** 删除行为 */
  onDelete?: string;
  /** 更新行为 */
  onUpdate?: string;
}

/**
 * 分析上下文状态
 */
export interface AnalysisState {
  /** 已注册的表（变量名 -> 注册信息） */
  tables: Map<string, TableRegistry>;
  /** 变量名到表名的映射 */
  variableToTableName: Map<string, string>;
  /** 待解析的外键引用 */
  pendingReferences: PendingReference[];
  /** 完整的表信息（分析完成后填充） */
  tableInfos: Map<string, TableInfo>;
}

/**
 * 分析上下文 Store
 */
export interface AnalysisStore {
  /** 获取当前状态 */
  getState: () => AnalysisState;
  
  // ========== 表注册 ==========
  
  /** 注册表（第一轮扫描） */
  registerTable: (registry: TableRegistry) => void;
  
  /** 获取表注册信息 */
  getTable: (variableName: string) => TableRegistry | undefined;
  
  /** 通过变量名获取表名 */
  getTableName: (variableName: string) => string | undefined;
  
  /** 检查表是否已注册 */
  hasTable: (variableName: string) => boolean;
  
  // ========== 外键引用 ==========
  
  /** 添加待解析的外键引用 */
  addPendingReference: (ref: PendingReference) => void;
  
  /** 获取所有待解析的外键引用 */
  getPendingReferences: () => PendingReference[];
  
  /** 清空待解析的外键引用 */
  clearPendingReferences: () => void;
  
  // ========== 表信息 ==========
  
  /** 添加完整表信息 */
  addTableInfo: (tableInfo: TableInfo) => void;
  
  /** 获取完整表信息 */
  getTableInfo: (variableName: string) => TableInfo | undefined;
  
  /** 获取所有表信息 */
  getAllTableInfos: () => TableInfo[];
  
  // ========== 重置 ==========
  
  /** 重置状态 */
  reset: () => void;
}

// ============================================================================
// Store 创建
// ============================================================================

/**
 * 创建初始状态
 */
function createInitialState(): AnalysisState {
  return {
    tables: new Map(),
    variableToTableName: new Map(),
    pendingReferences: [],
    tableInfos: new Map(),
  };
}

/**
 * 创建分析上下文 Store
 */
export function createAnalysisStore(): AnalysisStore {
  let state = createInitialState();

  return {
    getState: () => state,

    // ========== 表注册 ==========

    registerTable: (registry) => {
      state.tables.set(registry.variableName, registry);
      state.variableToTableName.set(registry.variableName, registry.tableName);
    },

    getTable: (variableName) => {
      return state.tables.get(variableName);
    },

    getTableName: (variableName) => {
      return state.variableToTableName.get(variableName);
    },

    hasTable: (variableName) => {
      return state.tables.has(variableName);
    },

    // ========== 外键引用 ==========

    addPendingReference: (ref) => {
      state.pendingReferences.push(ref);
    },

    getPendingReferences: () => {
      return [...state.pendingReferences];
    },

    clearPendingReferences: () => {
      state.pendingReferences = [];
    },

    // ========== 表信息 ==========

    addTableInfo: (tableInfo) => {
      state.tableInfos.set(tableInfo.variableName, tableInfo);
    },

    getTableInfo: (variableName) => {
      return state.tableInfos.get(variableName);
    },

    getAllTableInfos: () => {
      return Array.from(state.tableInfos.values());
    },

    // ========== 重置 ==========

    reset: () => {
      state = createInitialState();
    },
  };
}

// ============================================================================
// 全局 Store 实例（可选，用于简化调用）
// ============================================================================

let globalStore: AnalysisStore | undefined;

/**
 * 获取或创建全局 Store
 */
export function getGlobalStore(): AnalysisStore {
  if (!globalStore) {
    globalStore = createAnalysisStore();
  }
  return globalStore;
}

/**
 * 重置全局 Store
 */
export function resetGlobalStore(): void {
  if (globalStore) {
    globalStore.reset();
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 解析外键引用，填充到表信息中
 */
export function resolveReferences(store: AnalysisStore): void {
  const pendingRefs = store.getPendingReferences();

  for (const ref of pendingRefs) {
    const tableInfo = store.getTableInfo(ref.tableVariable);
    if (!tableInfo) continue;

    // 查找对应的字段
    const column = tableInfo.columns.find(
      (col) => col.propertyName === ref.columnName
    );
    if (!column) continue;

    // 解析引用的表名
    const referencedTableName = store.getTableName(ref.referencedTableVariable);
    if (!referencedTableName) {
      // 引用的表未注册，保留变量名
      column.constraints.references = {
        referencedTable: ref.referencedTableVariable,
        referencedColumn: ref.referencedColumnName,
        onDelete: ref.onDelete,
        onUpdate: ref.onUpdate,
      };
    } else {
      column.constraints.references = {
        referencedTable: referencedTableName,
        referencedColumn: ref.referencedColumnName,
        onDelete: ref.onDelete,
        onUpdate: ref.onUpdate,
      };
    }
  }

  // 清空待解析列表
  store.clearPendingReferences();
}
