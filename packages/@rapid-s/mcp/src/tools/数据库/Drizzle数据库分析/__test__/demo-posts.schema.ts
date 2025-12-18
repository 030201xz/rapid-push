// /**
//  * Demo Schema - 文章表（从表，包含外键）
//  *
//  * 用于测试外键解析功能
//  * - authorId 外键引用 demoUsers.id
//  * - reviewerId 外键引用 demoUsers.id（可选）
//  */

// import {
//   boolean,
//   index,
//   integer,
//   text,
//   timestamp,
//   uuid,
//   varchar,
// } from 'drizzle-orm/pg-core';
// import { appSchema } from './_schema';
// import { demoUsers } from './demo-users.schema';

// export const demoPosts = appSchema.table(
//   'demo_posts',
//   {
//     id: uuid('id').primaryKey().defaultRandom(),
//     /** 文章标题 */
//     title: varchar('title', { length: 200 }).notNull(),
//     /** 文章内容 */
//     content: text('content').notNull(),
//     /** 文章摘要 */
//     summary: text('summary'),
//     /** 作者 ID（外键引用 demoUsers） */
//     authorId: uuid('author_id')
//       .notNull()
//       .references(() => demoUsers.id, { onDelete: 'cascade' }),
//     /** 审核人 ID（外键引用 demoUsers，可选） */
//     reviewerId: uuid('reviewer_id').references(() => demoUsers.id, {
//       onDelete: 'set null',
//     }),
//     /** 文章状态 (draft, published, archived) */
//     status: varchar('status', { length: 20 }).notNull().default('draft'),
//     /** 浏览次数 */
//     viewCount: integer('view_count').default(0).notNull(),
//     /** 是否置顶 */
//     isPinned: boolean('is_pinned').default(false).notNull(),
//     /** 是否已删除 */
//     isDeleted: boolean('is_deleted').default(false).notNull(),
//     /** 发布时间 */
//     publishedAt: timestamp('published_at'),
//     createdAt: timestamp('created_at').notNull().defaultNow(),
//     updatedAt: timestamp('updated_at').notNull().defaultNow(),
//   },
//   t => [
//     index('idx_demo_posts_author_id').on(t.authorId),
//     index('idx_demo_posts_reviewer_id').on(t.reviewerId),
//     index('idx_demo_posts_status').on(t.status),
//     index('idx_demo_posts_is_pinned').on(t.isPinned),
//     index('idx_demo_posts_published_at').on(t.publishedAt),
//   ],
// );

// export type DemoPost = typeof demoPosts.$inferSelect;
// export type NewDemoPost = typeof demoPosts.$inferInsert;
