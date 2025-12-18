/**
 * 领域状态解析器
 *
 * 解析 *.state.ts 文件，提取领域状态信息
 */

import type { DomainState, StateTransition } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractEnumMembers,
  extractUnionLiterals,
} from "../ast";

/**
 * 解析领域状态文件
 *
 * @param filePath 状态文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 领域状态信息（如果解析成功）
 */
export function parseDomainState(
  filePath: string,
  contextId: string
): DomainState | null {
  const sourceFile = parseFile(filePath);

  // 优先查找枚举
  const enums = sourceFile.getEnums();
  for (const enumDecl of enums) {
    if (enumDecl.getName()?.includes("State") || enumDecl.getName()?.includes("Status")) {
      return parseStateFromEnum(enumDecl, filePath, contextId);
    }
  }

  // 尝试查找类型别名（联合类型）
  const typeAliases = sourceFile.getTypeAliases();
  for (const typeAlias of typeAliases) {
    if (typeAlias.getName()?.includes("State") || typeAlias.getName()?.includes("Status")) {
      return parseStateFromTypeAlias(typeAlias, filePath, contextId);
    }
  }

  // 取第一个导出的枚举或类型别名
  for (const enumDecl of enums) {
    if (enumDecl.isExported()) {
      return parseStateFromEnum(enumDecl, filePath, contextId);
    }
  }

  for (const typeAlias of typeAliases) {
    if (typeAlias.isExported()) {
      return parseStateFromTypeAlias(typeAlias, filePath, contextId);
    }
  }

  return null;
}

/**
 * 从枚举解析状态
 */
function parseStateFromEnum(
  enumDecl: ReturnType<ReturnType<typeof parseFile>["getEnums"]>[0],
  filePath: string,
  contextId: string
): DomainState {
  const typeName = enumDecl.getName() ?? "UnknownState";

  // 提取状态名称
  const stateName = typeName.replace(/State$|Status$/, "");

  // 生成唯一 ID
  const id = `state:${contextId}:${typeName.toLowerCase()}`;

  // 提取枚举成员作为状态值
  const states = extractEnumMembers(enumDecl);

  // 尝试从 JSDoc 或命名推断状态转换
  const transitions = inferTransitions(states, enumDecl);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(enumDecl);

  return {
    id,
    name: stateName,
    typeName,
    contextId,
    filePath,
    states,
    transitions,
    isEnum: true,
    decorators: [],
    description,
    lineNumber: enumDecl.getStartLineNumber(),
  };
}

/**
 * 从类型别名解析状态
 */
function parseStateFromTypeAlias(
  typeAlias: ReturnType<ReturnType<typeof parseFile>["getTypeAliases"]>[0],
  filePath: string,
  contextId: string
): DomainState {
  const typeName = typeAlias.getName() ?? "UnknownState";

  // 提取状态名称
  const stateName = typeName.replace(/State$|Status$/, "");

  // 生成唯一 ID
  const id = `state:${contextId}:${typeName.toLowerCase()}`;

  // 提取联合类型的字面量值
  const states = extractUnionLiterals(typeAlias);

  // 尝试推断状态转换
  const transitions = inferTransitions(states, typeAlias);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(typeAlias);

  return {
    id,
    name: stateName,
    typeName,
    contextId,
    filePath,
    states,
    transitions,
    isEnum: false,
    decorators: [],
    description,
    lineNumber: typeAlias.getStartLineNumber(),
  };
}

/**
 * 从状态值推断可能的状态转换
 *
 * 基于常见的状态命名模式推断
 */
function inferTransitions(
  states: string[],
  _node: { getJsDocs?: () => { getDescription: () => string }[] }
): StateTransition[] {
  const transitions: StateTransition[] = [];

  // 常见的状态顺序模式
  const orderPatterns: Record<string, string[]> = {
    // 用户状态
    Pending: ["Active", "Rejected"],
    Active: ["Suspended", "Disabled", "Locked"],
    Suspended: ["Active", "Disabled"],
    Locked: ["Active", "Unlocked"],
    Unlocked: ["Active"],
    Disabled: [],

    // 订单状态
    Created: ["Confirmed", "Cancelled"],
    Confirmed: ["Processing", "Cancelled"],
    Processing: ["Completed", "Failed"],
    Completed: [],
    Cancelled: [],
    Failed: ["Processing"],

    // 通用状态
    Draft: ["Published", "Deleted"],
    Published: ["Archived", "Deleted"],
    Archived: ["Published"],
    Deleted: [],
  };

  // 根据已知模式推断转换
  for (const state of states) {
    const nextStates = orderPatterns[state];
    if (nextStates) {
      for (const nextState of nextStates) {
        if (states.includes(nextState)) {
          transitions.push({
            from: state,
            to: nextState,
          });
        }
      }
    }
  }

  return transitions;
}
