/**
 * 领域事件解析器
 *
 * 解析 *.event.ts 文件，提取领域事件信息
 *
 * 支持三种事件定义模式：
 * 1. 类声明: class AccountCreatedEvent extends DomainEvent {...}
 * 2. 接口声明: interface AccountCreatedEvent {...}
 * 3. defineEvent 函数调用: export const AccountCreated = defineEvent({...})<{...}>();
 */

import type { DomainEvent, PropertyInfo } from "../types";
import {
  parseFile,
  getJsDocDescription,
  extractClassProperties,
  getExtendsClass,
  extractDecorators,
  extractInterfaceProperties,
} from "../ast";
import { SyntaxKind, type Node } from "ts-morph";

/**
 * 解析领域事件文件
 *
 * @param filePath 事件文件路径
 * @param contextId 所属限界上下文 ID
 * @returns 领域事件信息（如果解析成功）
 */
export function parseDomainEvent(
  filePath: string,
  contextId: string
): DomainEvent | null {
  const sourceFile = parseFile(filePath);

  // 1. 优先查找 defineEvent 函数调用模式
  const defineEventResult = parseDefineEventPattern(sourceFile, filePath, contextId);
  if (defineEventResult) {
    return defineEventResult;
  }

  // 2. 查找类声明
  const classes = sourceFile.getClasses();
  const interfaces = sourceFile.getInterfaces();

  // 优先查找以 Event 结尾的类
  for (const cls of classes) {
    if (cls.getName()?.endsWith("Event")) {
      return parseEventFromClass(cls, filePath, contextId);
    }
  }

  // 3. 尝试查找接口
  for (const iface of interfaces) {
    if (iface.getName()?.endsWith("Event")) {
      return parseEventFromInterface(iface, filePath, contextId);
    }
  }

  // 4. 取第一个导出的类或接口作为后备
  for (const cls of classes) {
    if (cls.isExported()) {
      return parseEventFromClass(cls, filePath, contextId);
    }
  }

  for (const iface of interfaces) {
    if (iface.isExported()) {
      return parseEventFromInterface(iface, filePath, contextId);
    }
  }

  return null;
}

// ============================================================================
// defineEvent 模式解析
// ============================================================================

/**
 * 解析 defineEvent 函数调用模式
 *
 * 支持格式:
 * export const EventName = defineEvent({
 *   name: 'domain.event.name',
 *   aggregateType: 'AggregateName',
 *   version: 1,
 * })<{ payload properties }>();
 */
function parseDefineEventPattern(
  sourceFile: ReturnType<typeof parseFile>,
  filePath: string,
  contextId: string
): DomainEvent | null {
  // 遍历所有变量声明
  const variableStatements = sourceFile.getVariableStatements();

  for (const statement of variableStatements) {
    // 检查是否导出
    if (!statement.isExported()) {
      continue;
    }

    for (const declaration of statement.getDeclarations()) {
      const initializer = declaration.getInitializer();
      if (!initializer) continue;

      // 检查是否是 defineEvent 调用链
      const text = initializer.getText();
      if (!text.includes("defineEvent")) continue;

      // 解析事件信息
      const eventName = declaration.getName();
      const result = extractDefineEventInfo(initializer, eventName);

      if (result) {
        // 提取变量声明的 JSDoc
        const description = getJsDocDescription(statement);

        return {
          id: `event:${contextId}:${eventName.toLowerCase()}`,
          name: eventName,
          className: eventName,
          contextId,
          filePath,
          payload: result.payload,
          extendsClass: undefined,
          decorators: [],
          description,
          lineNumber: declaration.getStartLineNumber(),
          aggregateId: result.aggregateType
            ? `aggregate:${contextId}:${result.aggregateType.toLowerCase()}`
            : undefined,
          // 扩展字段：存储 defineEvent 的元数据
          metadata: {
            eventDotName: result.eventDotName,
            aggregateType: result.aggregateType,
            version: result.version,
          },
        };
      }
    }
  }

  return null;
}

/**
 * 从 defineEvent 调用表达式提取事件信息
 */
function extractDefineEventInfo(
  node: Node,
  eventName: string
): {
  eventDotName: string | undefined;
  aggregateType: string | undefined;
  version: number | undefined;
  payload: PropertyInfo[];
} | null {
  // 查找 defineEvent 调用
  // 结构: defineEvent({...})<{...}>()
  // 这是一个调用表达式链: CallExpression -> CallExpression(泛型) -> CallExpression(defineEvent)

  let eventDotName: string | undefined;
  let aggregateType: string | undefined;
  let version: number | undefined;
  const payload: PropertyInfo[] = [];

  // 递归查找所有调用表达式
  node.forEachDescendant((child) => {
    // 查找对象字面量（defineEvent 的第一个参数）
    if (child.getKind() === SyntaxKind.ObjectLiteralExpression) {
      const objText = child.getText();

      // 提取 name 属性
      const nameMatch = objText.match(/name:\s*['"]([^'"]+)['"]/);
      if (nameMatch) {
        eventDotName = nameMatch[1];
      }

      // 提取 aggregateType 属性
      const aggregateMatch = objText.match(/aggregateType:\s*['"]([^'"]+)['"]/);
      if (aggregateMatch) {
        aggregateType = aggregateMatch[1];
      }

      // 提取 version 属性
      const versionMatch = objText.match(/version:\s*(\d+)/);
      if (versionMatch) {
        version = parseInt(versionMatch[1], 10);
      }
    }

    // 查找类型字面量（泛型参数中的 payload 类型）
    if (child.getKind() === SyntaxKind.TypeLiteral) {
      // 解析类型字面量中的属性
      const typeLiteral = child;
      typeLiteral.forEachChild((member) => {
        if (member.getKind() === SyntaxKind.PropertySignature) {
          const propName = member.getChildAtIndex(0)?.getText() ?? "";
          // 获取类型（跳过名称和冒号）
          const typeNode = member.getChildrenOfKind(SyntaxKind.StringKeyword)[0]
            ?? member.getChildrenOfKind(SyntaxKind.NumberKeyword)[0]
            ?? member.getChildrenOfKind(SyntaxKind.BooleanKeyword)[0]
            ?? member.getChildrenOfKind(SyntaxKind.TypeReference)[0]
            ?? member.getChildrenOfKind(SyntaxKind.UnionType)[0]
            ?? member.getChildrenOfKind(SyntaxKind.LiteralType)[0];

          const propType = typeNode?.getText() ?? "unknown";

          // 获取 JSDoc 注释
          const jsDocComments = member.getLeadingCommentRanges();
          let propDescription: string | undefined;
          if (jsDocComments.length > 0) {
            const commentText = jsDocComments[0].getText();
            // 提取 /** ... */ 中的内容
            const match = commentText.match(/\/\*\*\s*(.+?)\s*\*\//s);
            if (match) {
              propDescription = match[1].replace(/\s*\*\s*/g, " ").trim();
            }
          }

          payload.push({
            name: propName,
            type: propType,
            isOptional: member.getText().includes("?:"),
            isReadonly: member.getText().startsWith("readonly"),
            accessibility: undefined,
            description: propDescription,
          });
        }
      });
    }
  });

  // 如果没有找到 defineEvent 的配置，返回 null
  if (!eventDotName && !aggregateType) {
    return null;
  }

  return {
    eventDotName,
    aggregateType,
    version,
    payload,
  };
}

/**
 * 从类解析事件
 */
function parseEventFromClass(
  eventClass: ReturnType<ReturnType<typeof parseFile>["getClasses"]>[0],
  filePath: string,
  contextId: string
): DomainEvent {
  const className = eventClass.getName() ?? "UnknownEvent";

  // 提取事件名称（移除 Event 后缀）
  const eventName = className.replace(/Event$/, "");

  // 生成唯一 ID
  const id = `event:${contextId}:${className.toLowerCase()}`;

  // 提取属性作为事件载荷
  const properties = extractClassProperties(eventClass);

  // 过滤出有效载荷属性（排除元数据字段）
  const payload = filterPayloadProperties(properties);

  // 提取装饰器
  const decorators = extractDecorators(eventClass);

  // 提取继承关系
  const extendsClass = getExtendsClass(eventClass);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(eventClass);

  return {
    id,
    name: eventName,
    className,
    contextId,
    filePath,
    payload,
    extendsClass,
    decorators,
    description,
    lineNumber: eventClass.getStartLineNumber(),
    aggregateId: undefined, // 需要后续关联分析
  };
}

/**
 * 从接口解析事件
 */
function parseEventFromInterface(
  eventInterface: ReturnType<ReturnType<typeof parseFile>["getInterfaces"]>[0],
  filePath: string,
  contextId: string
): DomainEvent {
  const interfaceName = eventInterface.getName() ?? "UnknownEvent";

  // 提取事件名称
  const eventName = interfaceName.replace(/Event$/, "");

  // 生成唯一 ID
  const id = `event:${contextId}:${interfaceName.toLowerCase()}`;

  // 提取属性作为事件载荷
  const properties = extractInterfaceProperties(eventInterface);

  // 过滤出有效载荷属性
  const payload = filterPayloadProperties(properties);

  // 提取 JSDoc 描述
  const description = getJsDocDescription(eventInterface);

  return {
    id,
    name: eventName,
    className: interfaceName,
    contextId,
    filePath,
    payload,
    extendsClass: undefined,
    decorators: [],
    description,
    lineNumber: eventInterface.getStartLineNumber(),
    aggregateId: undefined,
  };
}

/**
 * 过滤出有效的载荷属性（排除通用元数据字段）
 */
function filterPayloadProperties(properties: PropertyInfo[]): PropertyInfo[] {
  // 通用元数据字段（通常由基类提供）
  const metadataFields = [
    "eventId",
    "eventType",
    "timestamp",
    "occurredAt",
    "version",
    "aggregateId",
    "aggregateType",
    "correlationId",
    "causationId",
  ];

  return properties.filter((p) => !metadataFields.includes(p.name));
}
