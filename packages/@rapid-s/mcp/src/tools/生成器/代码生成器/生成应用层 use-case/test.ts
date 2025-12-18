// /**
//  * DDD Use-Case Generator 测试脚本
//  *
//  * 使用示例数据测试工具是否能正确生成 Use-Case 文件
//  */
// import { rm } from "node:fs/promises";
// import { join } from "node:path";
// import "reflect-metadata";

// import { DddUseCaseGeneratorTool } from "./index";

// const TEST_OUTPUT_DIR = join(import.meta.dir, "_generated");

// // ============================================================================
// // 测试辅助函数
// // ============================================================================

// async function cleanup(): Promise<void> {
//   try {
//     await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
//     console.log("🧹 清理测试目录完成");
//   } catch {
//     // 忽略目录不存在的错误
//   }
// }

// // ============================================================================
// // 测试数据
// // ============================================================================

// const testInput = {
//   basePath: TEST_OUTPUT_DIR,
//   aggregateName: "User",
//   operations: [
//     // Mutation: 注册用户（带 Handler 配置）
//     {
//       type: "mutation" as const,
//       name: "register-user",
//       description: "用户注册",
//       input: [
//         { name: "email", zodType: "z.string().email()", comment: "邮箱地址" },
//         { name: "password", zodType: "z.string().min(8)", comment: "密码" },
//         {
//           name: "nickname",
//           zodType: "z.string().min(2).max(20)",
//           comment: "昵称",
//         },
//       ],
//       output: [
//         { name: "userId", zodType: "z.uuid()", comment: "用户ID" },
//         {
//           name: "createdAt",
//           zodType: "z.iso.datetime()",
//           comment: "创建时间",
//         },
//       ],
//       handler: {
//         dependencies: [
//           {
//             name: "userRepo",
//             type: "IUserRepository",
//             importPath: "../../../../../domain",
//           },
//         ],
//       },
//     },

//     // Query: 检查邮箱是否存在
//     {
//       type: "query" as const,
//       name: "check-email-exists",
//       description: "检查邮箱是否已注册",
//       input: [{ name: "email", zodType: "z.string().email()" }],
//       output: [{ name: "exists", zodType: "z.boolean()" }],
//       handler: {
//         dependencies: [
//           {
//             name: "userRepo",
//             type: "IUserRepository",
//             importPath: "../../../../../domain",
//           },
//         ],
//       },
//     },

//     // Query: 获取用户资料（带自定义 imports）
//     {
//       type: "query" as const,
//       name: "get-user-profile",
//       description: "获取用户详细资料",
//       input: [{ name: "userId", zodType: "z.uuid()" }],
//       output: [
//         { name: "id", zodType: "z.uuid()" },
//         { name: "email", zodType: "z.string().email()" },
//         { name: "nickname", zodType: "z.string()" },
//         { name: "avatar", zodType: "z.url().nullable()" },
//         { name: "createdAt", zodType: "z.iso.datetime()" },
//       ],
//       handler: {
//         dependencies: [
//           {
//             name: "userRepo",
//             type: "IUserRepository",
//             importPath: "../../../../../domain",
//           },
//         ],
//         imports: [
//           "import { toUserProfileResponse } from '../../../../mappers/user.mapper';",
//         ],
//       },
//     },

//     // Mutation: 更新用户资料
//     {
//       type: "mutation" as const,
//       name: "update-profile",
//       description: "更新用户资料",
//       input: [
//         { name: "userId", zodType: "z.uuid()" },
//         { name: "nickname", zodType: "z.string().min(2).max(20).optional()" },
//         { name: "avatar", zodType: "z.url().optional()" },
//       ],
//       output: [{ name: "success", zodType: "z.boolean()" }],
//     },

//     // Query: 只生成 DTO（不生成 Handler）
//     {
//       type: "query" as const,
//       name: "get-user-list",
//       description: "获取用户列表",
//       generateHandler: false,
//       input: {
//         ref: "paginationInputSchema",
//         from: "../_shared/pagination",
//       },
//       output: {
//         ref: "paginatedResponseSchema",
//         from: "../_shared/pagination",
//         transform: ".extend({ users: z.array(userSchema) })",
//       },
//     },
//   ],
// };

// // ============================================================================
// // 主函数
// // ============================================================================

// async function main(): Promise<void> {
//   console.log("🚀 开始测试 DDD Use-Case Generator\n");

//   // 清理之前的测试输出
//   await cleanup();

//   // 创建工具实例
//   const tool = new DddUseCaseGeneratorTool();

//   // 初始化
//   await tool.onInit();
//   await tool.onReady();

//   try {
//     // 执行生成
//     const result = await tool.execute(testInput, {
//       toolName: "ddd_use_case_generator",
//       timestamp: Date.now(),
//     });

//     // 输出结果
//     console.log("\n📋 执行结果：");
//     console.log(`成功: ${result.success}`);

//     if (result.data) {
//       console.log(`\n生成文件数: ${result.data.generated.length}`);
//       console.log("\n--- Summary ---");
//       console.log(result.data.summary);
//     }

//     if (result.error) {
//       console.error(`\n❌ 错误: ${result.error}`);
//     }
//   } finally {
//     // 销毁
//     await tool.onDestroy();
//   }
// }

// // 运行测试
// main().catch(console.error);
