// /**
//  * Demo Schema - 用户表（主表）
//  *
//  * 用于测试外键解析功能
//  */

// import {
//   boolean,
//   index,
//   text,
//   timestamp,
//   uuid,
//   varchar,
// } from 'drizzle-orm/pg-core';
// import { appSchema } from './_schema';

// export const demoUsers = appSchema.table(
//   'demo_users',
//   {
//     id: uuid('id').primaryKey().defaultRandom(),
//     /** 用户名 */
//     username: varchar('username', { length: 50 }).notNull().unique(),
//     /** 邮箱 */
//     email: varchar('email', { length: 255 }).notNull().unique(),
//     /** 密码哈希 */
//     passwordHash: varchar('password_hash', { length: 255 }).notNull(),
//     /** 个人简介 */
//     bio: text('bio'),
//     /** 是否激活 */
//     isActive: boolean('is_active').default(true).notNull(),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//     updatedAt: timestamp('updated_at').notNull().defaultNow(),
//   },
//   t => [
//     index('idx_demo_users_username').on(t.username),
//     index('idx_demo_users_email').on(t.email),
//   ],
// );

// export type DemoUser = typeof demoUsers.$inferSelect;
// export type NewDemoUser = typeof demoUsers.$inferInsert;
