/**
 * 类型信息提取器
 *
 * 从 AST 节点提取属性、方法、参数等类型信息
 */

// ts-morph 是一个 TypeScript AST 操作库，可以方便地解析和操作 TypeScript 代码
import {
  ClassDeclaration,
  InterfaceDeclaration,
  MethodDeclaration,
  PropertyDeclaration,
  PropertySignature,
  ParameterDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  MethodSignature,
  Node,
} from "ts-morph";
import type {
  PropertyInfo,
  MethodInfo,
  ParameterInfo,
  DecoratorInfo,
} from "../types";
import { getJsDocDescription } from "./ts-parser";

// ============================================================================
// 类型文本提取（本地版本，避免类型兼容性问题）
// ============================================================================

/**
 * 获取节点类型的字符串表示
 */
function getNodeTypeText(node: Node, simplify = true): string {
  try {
    let text = node.getType().getText();

    if (simplify) {
      // 简化导入路径
      text = text.replace(/import\([^)]+\)\./g, "");
    }

    return text;
  } catch {
    return "unknown";
  }
}

// ============================================================================
// 装饰器提取
// ============================================================================

/**
 * 提取装饰器信息
 */
export function extractDecorators(
  node: ClassDeclaration | MethodDeclaration | PropertyDeclaration
): DecoratorInfo[] {
  const decorators = node.getDecorators();

  return decorators.map((decorator) => {
    const name = decorator.getName();
    const args = decorator.getArguments().map((arg) => arg.getText());

    return {
      name,
      arguments: args.length > 0 ? args : undefined,
    };
  });
}

// ============================================================================
// 属性提取
// ============================================================================

/**
 * 从类属性提取属性信息
 */
export function extractPropertyFromClass(
  prop: PropertyDeclaration
): PropertyInfo {
  const name = prop.getName();
  const type = getNodeTypeText(prop);
  const isOptional = prop.hasQuestionToken();
  const isReadonly = prop.isReadonly();
  const description = getJsDocDescription(prop);

  // 获取访问修饰符
  let accessibility: PropertyInfo["accessibility"];
  if (prop.hasModifier(1 /* SyntaxKind.PublicKeyword */)) {
    accessibility = "public";
  } else if (prop.hasModifier(2 /* SyntaxKind.PrivateKeyword */)) {
    accessibility = "private";
  } else if (prop.hasModifier(4 /* SyntaxKind.ProtectedKeyword */)) {
    accessibility = "protected";
  }

  return {
    name,
    type,
    isOptional,
    isReadonly,
    accessibility,
    description,
  };
}

/**
 * 从接口属性提取属性信息
 */
export function extractPropertyFromInterface(
  prop: PropertySignature
): PropertyInfo {
  const name = prop.getName();
  const type = getNodeTypeText(prop);
  const isOptional = prop.hasQuestionToken();
  const isReadonly = prop.isReadonly();
  const description = getJsDocDescription(prop);

  return {
    name,
    type,
    isOptional,
    isReadonly,
    description,
  };
}

/**
 * 从构造函数参数提取属性信息（支持 parameter properties）
 * TypeScript 支持在构造函数参数前加修饰符来自动创建类属性
 * 例如：constructor(private readonly _name: string) 会自动创建 _name 属性
 */
export function extractConstructorParameters(
  cls: ClassDeclaration
): PropertyInfo[] {
  const constructors = cls.getConstructors();
  if (constructors.length === 0) {
    return [];
  }

  // 取第一个构造函数（通常只有一个）
  const ctor = constructors[0];
  const properties: PropertyInfo[] = [];

  for (const param of ctor.getParameters()) {
    // 检查是否有访问修饰符（表示这是一个 parameter property）
    const scope = param.getScope();
    if (!scope) {
      continue; // 普通参数，不是属性
    }

    const name = param.getName();
    const type = getNodeTypeText(param);
    const isOptional = param.isOptional();
    const isReadonly = param.isReadonly();

    let accessibility: PropertyInfo["accessibility"];
    switch (scope) {
      case "public":
        accessibility = "public";
        break;
      case "private":
        accessibility = "private";
        break;
      case "protected":
        accessibility = "protected";
        break;
    }

    properties.push({
      name,
      type,
      isOptional,
      isReadonly,
      accessibility,
      description: undefined,
    });
  }

  return properties;
}

/**
 * 提取类的所有属性（包括显式声明的属性和构造函数参数属性）
 */
export function extractClassProperties(cls: ClassDeclaration): PropertyInfo[] {
  // 显式声明的属性
  const explicitProps = cls.getProperties().map(extractPropertyFromClass);
  
  // 构造函数参数属性
  const ctorProps = extractConstructorParameters(cls);
  
  // 合并并去重（以名称为准）
  const propMap = new Map<string, PropertyInfo>();
  
  for (const prop of [...explicitProps, ...ctorProps]) {
    propMap.set(prop.name, prop);
  }
  
  return Array.from(propMap.values());
}

/**
 * 提取接口的所有属性
 */
export function extractInterfaceProperties(
  iface: InterfaceDeclaration
): PropertyInfo[] {
  return iface.getProperties().map(extractPropertyFromInterface);
}

// ============================================================================
// 参数提取
// ============================================================================

/**
 * 提取参数信息
 */
export function extractParameter(param: ParameterDeclaration): ParameterInfo {
  const name = param.getName();
  const type = getNodeTypeText(param);
  const isOptional = param.isOptional();
  const initializer = param.getInitializer();
  const defaultValue = initializer?.getText();

  return {
    name,
    type,
    isOptional,
    defaultValue,
    description: undefined, // 参数描述需要从 JSDoc @param 获取
  };
}

/**
 * 提取方法的所有参数
 */
export function extractParameters(
  method: MethodDeclaration | MethodSignature
): ParameterInfo[] {
  return method.getParameters().map(extractParameter);
}

// ============================================================================
// 方法提取
// ============================================================================

/**
 * 从类方法提取方法信息
 */
export function extractMethodFromClass(method: MethodDeclaration): MethodInfo {
  const name = method.getName();
  const parameters = extractParameters(method);
  const returnType = method.getReturnType().getText(method);
  const isAsync = method.isAsync();
  const isStatic = method.isStatic();
  const description = getJsDocDescription(method);
  const lineNumber = method.getStartLineNumber();

  // 获取访问修饰符
  let accessibility: MethodInfo["accessibility"];
  if (method.hasModifier(1 /* SyntaxKind.PublicKeyword */)) {
    accessibility = "public";
  } else if (method.hasModifier(2 /* SyntaxKind.PrivateKeyword */)) {
    accessibility = "private";
  } else if (method.hasModifier(4 /* SyntaxKind.ProtectedKeyword */)) {
    accessibility = "protected";
  }

  return {
    name,
    parameters,
    returnType,
    isAsync,
    isStatic,
    accessibility,
    description,
    lineNumber,
  };
}

/**
 * 从接口方法提取方法信息
 */
export function extractMethodFromInterface(
  method: MethodSignature
): MethodInfo {
  const name = method.getName();
  const parameters = extractParameters(method);
  const returnType = method.getReturnType().getText(method);
  const description = getJsDocDescription(method);
  const lineNumber = method.getStartLineNumber();

  return {
    name,
    parameters,
    returnType,
    isAsync: returnType.startsWith("Promise<"),
    isStatic: false,
    description,
    lineNumber,
  };
}

/**
 * 提取类的所有方法
 */
export function extractClassMethods(cls: ClassDeclaration): MethodInfo[] {
  return cls.getMethods().map(extractMethodFromClass);
}

/**
 * 提取接口的所有方法
 */
export function extractInterfaceMethods(
  iface: InterfaceDeclaration
): MethodInfo[] {
  return iface.getMethods().map(extractMethodFromInterface);
}

// ============================================================================
// 类信息提取
// ============================================================================

/**
 * 获取类继承的基类名称
 */
export function getExtendsClass(cls: ClassDeclaration): string | undefined {
  const extendsClause = cls.getExtends();
  return extendsClause?.getText();
}

/**
 * 获取类实现的接口名称列表
 */
export function getImplementsInterfaces(cls: ClassDeclaration): string[] {
  return cls.getImplements().map((impl) => impl.getText());
}

/**
 * 获取接口继承的接口名称列表
 */
export function getExtendsInterfaces(iface: InterfaceDeclaration): string[] {
  return iface.getExtends().map((ext) => ext.getText());
}

/**
 * 获取装饰器名称列表
 */
export function getDecoratorNames(cls: ClassDeclaration): string[] {
  return cls.getDecorators().map((d) => d.getName());
}

// ============================================================================
// 枚举和类型别名提取
// ============================================================================

/**
 * 提取枚举成员
 */
export function extractEnumMembers(enumDecl: EnumDeclaration): string[] {
  return enumDecl.getMembers().map((member) => member.getName());
}

/**
 * 提取联合类型的字面量值
 */
export function extractUnionLiterals(
  typeAlias: TypeAliasDeclaration
): string[] {
  const typeNode = typeAlias.getTypeNode();
  if (!typeNode) {
    return [];
  }

  const text = typeNode.getText();

  // 简单解析联合类型字符串
  // 例如: "Active" | "Inactive" | "Suspended"
  const matches = text.match(/"([^"]+)"|'([^']+)'/g);

  if (matches) {
    return matches.map((m) => m.replace(/['"]/g, ""));
  }

  return [];
}

// ============================================================================
// 构造函数依赖提取
// ============================================================================

/**
 * 提取类构造函数的依赖注入参数
 */
export function extractConstructorDependencies(
  cls: ClassDeclaration
): ParameterInfo[] {
  const constructors = cls.getConstructors();

  if (constructors.length === 0) {
    return [];
  }

  // 取第一个构造函数
  const ctor = constructors[0];

  return ctor.getParameters().map(extractParameter);
}
