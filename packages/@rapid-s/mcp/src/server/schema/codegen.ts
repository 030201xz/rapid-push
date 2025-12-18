/**
 * GraphQL Codegen 配置
 */

import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/server/schema/types/*.graphql',
  generates: {
    // 生成合并后的 schema.graphql（供客户端使用）
    './schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
    // 生成 TypeScript 类型（供后端使用）
    './src/server/generated/graphql.ts': {
      plugins: [
        {
          add: {
            content: `/**
 * 本文件由 GraphQL Code Generator 自动生成，请勿手动修改
 * 生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
 */
// @ts-nocheck
/* eslint-disable */`,
          },
        },
        'typescript',
        'typescript-resolvers',
      ],
      config: {
        // 类型安全配置
        strict: true,
        useTypeImports: true,
        enumsAsTypes: true,

        // 上下文类型
        contextType: '../infrastructure/graphql#GraphQLContext',

        // 标量类型映射
        scalars: {
          DateTime: 'Date',
          JSON: 'Record<string, unknown>',
        },

        // 生成更严格的类型
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
