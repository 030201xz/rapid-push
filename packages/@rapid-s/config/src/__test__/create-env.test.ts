/**
 * createEnv 核心功能测试
 *
 * 测试结构化配置的验证、类型推断等核心功能
 */

import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { createEnv } from "../create-env";
import { hostSchema, portSchema } from "../presets";

describe("createEnv - 基础功能", () => {
  it("应该验证并返回类型安全的结构化配置对象", () => {
    const env = createEnv({
      schema: {
        port: z.coerce.number(),
        host: z.string(),
      },
      runtimeEnv: {
        PORT: "3000",
        HOST: "localhost",
      },
    });

    expect(env.port).toBe(3000);
    expect(env.host).toBe("localhost");
  });

  it("应该支持嵌套结构", () => {
    const env = createEnv({
      schema: {
        database: {
          host: z.string(),
          port: z.coerce.number(),
        },
      },
      runtimeEnv: {
        DATABASE_HOST: "localhost",
        DATABASE_PORT: "5432",
      },
    });

    expect(env.database.host).toBe("localhost");
    expect(env.database.port).toBe(5432);
  });

  it("应该支持深层嵌套结构", () => {
    const env = createEnv({
      schema: {
        database: {
          pool: {
            max: z.coerce.number(),
            idleTimeout: z.coerce.number(),
          },
        },
      },
      runtimeEnv: {
        DATABASE_POOL_MAX: "10",
        DATABASE_POOL_IDLE_TIMEOUT: "30",
      },
    });

    expect(env.database.pool.max).toBe(10);
    expect(env.database.pool.idleTimeout).toBe(30);
  });

  it("应该支持预设 Schema", () => {
    const env = createEnv({
      schema: {
        api: {
          host: hostSchema,
          port: portSchema,
        },
      },
      runtimeEnv: {
        API_HOST: "api.example.com",
        API_PORT: "8080",
      },
    });

    expect(env.api.host).toBe("api.example.com");
    expect(env.api.port).toBe(8080);
  });
});

describe("createEnv - camelCase 转 SCREAMING_SNAKE_CASE", () => {
  it("应该正确转换单词边界", () => {
    const env = createEnv({
      schema: {
        nodeEnv: z.string(),
        logLevel: z.string(),
        enablePlayground: z.string(),
      },
      runtimeEnv: {
        NODE_ENV: "development",
        LOG_LEVEL: "info",
        ENABLE_PLAYGROUND: "true",
      },
    });

    expect(env.nodeEnv).toBe("development");
    expect(env.logLevel).toBe("info");
    expect(env.enablePlayground).toBe("true");
  });

  it("应该正确处理嵌套路径", () => {
    const env = createEnv({
      schema: {
        database: {
          poolMax: z.coerce.number(),
          idleTimeoutSeconds: z.coerce.number(),
        },
      },
      runtimeEnv: {
        DATABASE_POOL_MAX: "10",
        DATABASE_IDLE_TIMEOUT_SECONDS: "30",
      },
    });

    expect(env.database.poolMax).toBe(10);
    expect(env.database.idleTimeoutSeconds).toBe(30);
  });
});

describe("createEnv - 验证错误处理", () => {
  it("缺失必需变量应该抛出错误", () => {
    expect(() =>
      createEnv({
        schema: {
          required: z.string(),
        },
        runtimeEnv: {},
      })
    ).toThrow();
  });

  it("类型不匹配应该抛出错误", () => {
    expect(() =>
      createEnv({
        schema: {
          port: portSchema,
        },
        runtimeEnv: {
          PORT: "invalid",
        },
      })
    ).toThrow();
  });

  it("应该支持自定义错误处理器", () => {
    let capturedError: z.ZodError | null = null;

    expect(() =>
      createEnv({
        schema: {
          required: z.string(),
        },
        runtimeEnv: {},
        onValidationError: (error) => {
          capturedError = error;
          throw new Error("自定义错误");
        },
      })
    ).toThrow("自定义错误");

    expect(capturedError).not.toBeNull();
  });
});

describe("createEnv - emptyStringAsUndefined 选项", () => {
  it("开启时应该将空字符串视为 undefined（默认行为）", () => {
    const env = createEnv({
      schema: {
        optional: z.string().optional(),
      },
      runtimeEnv: {
        OPTIONAL: "",
      },
    });

    expect(env.optional).toBeUndefined();
  });

  it("关闭时应该保留空字符串", () => {
    const env = createEnv({
      schema: {
        value: z.string(),
      },
      runtimeEnv: {
        VALUE: "",
      },
      emptyStringAsUndefined: false,
    });

    expect(env.value).toBe("");
  });
});

describe("createEnv - skipValidation 选项", () => {
  it("开启时应该跳过验证", () => {
    const env = createEnv({
      schema: {
        required: z.string(),
      },
      runtimeEnv: {},
      skipValidation: true,
    });

    expect(env.required).toBeUndefined();
  });
});

describe("createEnv - 返回对象不可变性", () => {
  it("返回的配置对象应该是冻结的", () => {
    const env = createEnv({
      schema: {
        value: z.string(),
      },
      runtimeEnv: {
        VALUE: "test",
      },
    });

    expect(Object.isFrozen(env)).toBe(true);
  });
});

describe("createEnv - 默认值支持", () => {
  it("应该支持 Schema 默认值", () => {
    const env = createEnv({
      schema: {
        port: z.coerce.number().default(3000),
        host: z.string().default("localhost"),
      },
      runtimeEnv: {},
    });

    expect(env.port).toBe(3000);
    expect(env.host).toBe("localhost");
  });

  it("提供的值应该覆盖默认值", () => {
    const env = createEnv({
      schema: {
        port: z.coerce.number().default(3000),
      },
      runtimeEnv: {
        PORT: "8080",
      },
    });

    expect(env.port).toBe(8080);
  });
});
