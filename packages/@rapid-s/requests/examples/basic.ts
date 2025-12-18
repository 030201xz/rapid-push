import { z } from 'zod';
import { createClient } from '../src';

/**
 * 基础用法示例
 */

// 定义响应 Schema
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  username: z.string(),
  website: z.url().optional(),
});

const PostSchema = z.object({
  userId: z.number(),
  id: z.number(),
  title: z.string(),
  body: z.string(),
});

// 创建客户端
const api = createClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 5000,
  headers: {
    'User-Agent': 'x-requests/0.1.0',
  },
});

// 示例 1: 简单的 GET 请求
async function example1() {
  console.log('\n=== 示例 1: GET 请求 ===');

  try {
    const user = await api.get('/users/:id', {
      params: { id: 1 },
      responseSchema: UserSchema,
    });

    console.log('User:', user);
    console.log('Name:', user.name); // 类型安全,自动推断为 string
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例 2: 带查询参数的 GET 请求
async function example2() {
  console.log('\n=== 示例 2: 带查询参数的 GET 请求 ===');

  const QuerySchema = z.object({
    userId: z.number(),
  });

  try {
    const posts = await api.get('/posts', {
      query: { userId: 1 },
      querySchema: QuerySchema,
      responseSchema: z.array(PostSchema),
    });

    console.log(`Found ${posts.length} posts`);
    console.log('First post:', posts[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例 3: POST 请求
async function example3() {
  console.log('\n=== 示例 3: POST 请求 ===');

  const CreatePostSchema = z.object({
    title: z.string().min(3),
    body: z.string().min(10),
    userId: z.number(),
  });

  try {
    const newPost = await api.post('/posts', {
      bodySchema: CreatePostSchema,
      responseSchema: PostSchema,
      body: {
        title: 'Test Post',
        body: 'This is a test post from x-requests',
        userId: 1,
      },
    });

    console.log('Created post:', newPost);
  } catch (error) {
    console.error('Error:', error);
  }
}

// 示例 4: 错误处理
async function example4() {
  console.log('\n=== 示例 4: 错误处理 ===');

  try {
    // 请求一个不存在的资源
    await api.get('/users/:id', {
      params: { id: 99999 },
      responseSchema: UserSchema,
    });
  } catch (error) {
    console.error('Caught error:', error);
  }
}

// 运行所有示例
async function main() {
  await example1();
  // await example2();
  // await example3();
  // await example4();
}

main();
