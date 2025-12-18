/**
 * GraphQL 自定义标量类型
 */

import { GraphQLScalarType, Kind } from 'graphql';

/**
 * DateTime 标量类型
 *
 * 序列化为 ISO 8601 字符串
 */
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 日期时间格式',

  // 从服务器发送到客户端
  serialize(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      return new Date(value).toISOString();
    }
    throw new Error('DateTime 序列化错误：期望 Date 或 string 类型');
  },

  // 从客户端变量接收
  parseValue(value: unknown): Date {
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('DateTime 解析错误：无效的日期字符串');
      }
      return date;
    }
    throw new Error('DateTime 解析错误：期望 string 类型');
  },

  // 从 GraphQL 查询字面量解析
  parseLiteral(ast): Date {
    if (ast.kind === Kind.STRING) {
      const date = new Date(ast.value);
      if (isNaN(date.getTime())) {
        throw new Error('DateTime 解析错误：无效的日期字符串');
      }
      return date;
    }
    throw new Error('DateTime 解析错误：期望 StringValue');
  },
});

/**
 * JSON 标量类型
 *
 * 用于传递任意 JSON 数据
 */
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON 数据类型',

  serialize(value: unknown): unknown {
    return value;
  },

  parseValue(value: unknown): unknown {
    return value;
  },

  parseLiteral(ast): unknown {
    switch (ast.kind) {
      case Kind.STRING:
        return ast.value;
      case Kind.INT:
        return parseInt(ast.value, 10);
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.NULL:
        return null;
      case Kind.LIST:
        return ast.values.map(v => JSONScalar.parseLiteral(v));
      case Kind.OBJECT:
        const obj: Record<string, unknown> = {};
        ast.fields.forEach(field => {
          obj[field.name.value] = JSONScalar.parseLiteral(field.value);
        });
        return obj;
      default:
        return null;
    }
  },
});

/** 所有自定义标量 */
export const scalars = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
};
