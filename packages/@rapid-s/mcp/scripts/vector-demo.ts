/**
 * 向量数据库演示脚本（真实 Embedding 版本）
 * 使用 Transformers.js + all-MiniLM-L6-v2 本地模型生成真实向量
 *
 * 模型信息：
 * - 名称：Xenova/all-MiniLM-L6-v2
 * - 维度：384
 * - 大小：~23MB（首次运行自动下载）
 * - 特点：轻量、中英文支持、语义理解能力强
 */
import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";
import * as pgvector from "pgvector";
import postgres from "postgres";

// ============================================================
// 类型定义
// ============================================================

/** 文档元数据结构 */
interface DocumentMetadata {
  source: string;
  category: string;
  author?: string;
}

/** 数据库文档记录 */
interface DocumentRecord {
  id: number;
  content: string;
  metadata: DocumentMetadata;
  embedding: string;
  created_at: Date;
  updated_at: Date;
}

/** 相似度搜索结果 */
interface SimilarityResult extends DocumentRecord {
  similarity: number;
}

/** 数据库配置 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// ============================================================
// 配置常量
// ============================================================

/** 数据库连接配置 */
const DB_CONFIG: DatabaseConfig = {
  host: "localhost",
  port: 5433,
  database: "vector_db",
  username: "postgres",
  password: "postgres123",
};

/**
 * Embedding 模型配置
 * 可选模型（均为 384 维）：
 * - Xenova/all-MiniLM-L6-v2: 英文为主，~23MB，速度快
 * - Xenova/multilingual-e5-small: 多语言支持，~120MB，中文效果更好
 * - Xenova/paraphrase-multilingual-MiniLM-L12-v2: 多语言，~120MB，效果最佳
 */
// const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
// const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
/** 向量维度（上述模型均为 384 维） */
const VECTOR_DIMENSION = 384;

// ============================================================
// Embedding 服务（真实模型）
// ============================================================

class EmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null;
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  /**
   * 初始化 embedding 模型
   * 首次调用会下载模型（约 23MB）
   */
  async initialize(): Promise<void> {
    if (this.extractor) return;

    console.log(`📦 正在加载 embedding 模型: ${this.modelName}`);
    console.log("   首次运行会自动下载模型，请稍候...\n");

    this.extractor = await pipeline("feature-extraction", this.modelName, {
      // 使用 fp32 精度获得最佳效果
      dtype: "fp32",
    });

    console.log("✅ Embedding 模型加载完成\n");
  }

  /**
   * 生成文本的 embedding 向量
   * @param text - 输入文本
   * @returns 归一化后的向量数组
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error("Embedding 服务未初始化，请先调用 initialize()");
    }

    // 使用 mean pooling + L2 归一化，适合余弦相似度计算
    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    // 转换为普通数组
    return Array.from(output.data as Float32Array);
  }

  /**
   * 批量生成 embedding
   * @param texts - 文本数组
   * @returns 向量数组的数组
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }
}

// ============================================================
// 数据库操作类
// ============================================================

class VectorDocumentStore {
  private sql: postgres.Sql;
  private embeddingService: EmbeddingService;

  constructor(config: DatabaseConfig, embeddingService: EmbeddingService) {
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
    });
    this.embeddingService = embeddingService;
  }

  /**
   * 初始化数据库表（如果需要重建）
   * 使用 384 维向量以匹配 all-MiniLM-L6-v2 模型
   */
  async initializeTable(): Promise<void> {
    // 删除旧表并重建（适配新的向量维度）
    await this.sql`DROP TABLE IF EXISTS documents CASCADE`;

    // 注意：vector(384) 必须硬编码，PostgreSQL 不支持参数化 DDL
    await this.sql.unsafe(`
      CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(384),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建 HNSW 索引
    await this.sql`
      CREATE INDEX documents_embedding_idx 
      ON documents 
      USING hnsw (embedding vector_cosine_ops)
    `;

    console.log(`✅ 数据库表已初始化（向量维度: ${VECTOR_DIMENSION}）\n`);
  }

  /**
   * 插入单个文档
   */
  async insertDocument(
    content: string,
    metadata: DocumentMetadata
  ): Promise<number> {
    const embedding = await this.embeddingService.generateEmbedding(content);
    const embeddingStr = pgvector.toSql(embedding);

    const result = await this.sql<{ id: number }[]>`
      INSERT INTO documents (content, metadata, embedding)
      VALUES (${content}, ${JSON.stringify(metadata)}, ${embeddingStr}::vector)
      RETURNING id
    `;

    const firstRow = result[0];
    if (!firstRow) throw new Error("插入文档失败：无返回结果");
    return firstRow.id;
  }

  /**
   * 批量插入文档（带进度显示）
   */
  async insertDocuments(
    docs: Array<{ content: string; metadata: DocumentMetadata }>
  ): Promise<number[]> {
    const ids: number[] = [];
    const total = docs.length;

    for (const [i, doc] of docs.entries()) {
      const embedding = await this.embeddingService.generateEmbedding(
        doc.content
      );
      const embeddingStr = pgvector.toSql(embedding);

      const result = await this.sql<{ id: number }[]>`
        INSERT INTO documents (content, metadata, embedding)
        VALUES (${doc.content}, ${JSON.stringify(doc.metadata)}, ${embeddingStr}::vector)
        RETURNING id
      `;

      const firstRow = result[0];
      if (!firstRow) throw new Error(`插入文档 ${i + 1} 失败：无返回结果`);
      ids.push(firstRow.id);

      // 显示进度
      process.stdout.write(`\r   进度: ${i + 1}/${total}`);
    }
    console.log(); // 换行

    return ids;
  }

  /**
   * 相似度搜索（余弦距离）
   * @param queryText - 查询文本
   * @param limit - 返回结果数量
   * @param threshold - 相似度阈值（0-1）
   */
  async similaritySearch(
    queryText: string,
    limit = 5,
    threshold = 0
  ): Promise<SimilarityResult[]> {
    const queryEmbedding =
      await this.embeddingService.generateEmbedding(queryText);
    const embeddingStr = pgvector.toSql(queryEmbedding);

    const results = await this.sql<SimilarityResult[]>`
      SELECT 
        id,
        content,
        metadata,
        embedding::text,
        created_at,
        updated_at,
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM documents
      WHERE 1 - (embedding <=> ${embeddingStr}::vector) >= ${threshold}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * 获取文档数量
   */
  async getDocumentCount(): Promise<number> {
    const result = await this.sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM documents
    `;

    const firstRow = result[0];
    if (!firstRow) throw new Error("查询文档数量失败：无返回结果");
    return parseInt(firstRow.count, 10);
  }

  /**
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    await this.sql.end();
  }
}

// ============================================================
// Mock 文档数据
// ============================================================

/** 模拟技术文档数据集 */
const MOCK_DOCUMENTS: Array<{ content: string; metadata: DocumentMetadata }> = [
  {
    content:
      "TypeScript 是 JavaScript 的超集，添加了静态类型检查功能。它可以帮助开发者在编译时发现潜在的类型错误，提高代码质量和可维护性。",
    metadata: {
      source: "typescript-guide",
      category: "编程语言",
      author: "技术团队",
    },
  },
  {
    content:
      "React 是一个用于构建用户界面的 JavaScript 库。它采用组件化的开发方式，通过虚拟 DOM 实现高效的 UI 更新。",
    metadata: { source: "react-docs", category: "前端框架" },
  },
  {
    content:
      "PostgreSQL 是一个功能强大的开源关系型数据库系统。它支持复杂查询、外键、触发器、视图和事务完整性。",
    metadata: { source: "postgresql-manual", category: "数据库" },
  },
  {
    content:
      "pgvector 是 PostgreSQL 的向量相似度搜索扩展。它支持精确和近似最近邻搜索，适用于机器学习和 AI 应用场景。",
    metadata: { source: "pgvector-readme", category: "数据库扩展" },
  },
  {
    content:
      "Docker 是一个开源的容器化平台，可以将应用程序及其依赖打包到容器中运行。容器是轻量级、可移植的，确保应用在不同环境中一致运行。",
    metadata: { source: "docker-docs", category: "容器技术" },
  },
  {
    content:
      "Bun 是一个快速的 JavaScript 运行时，内置打包器、测试运行器和包管理器。它比 Node.js 更快，原生支持 TypeScript。",
    metadata: { source: "bun-guide", category: "运行时" },
  },
  {
    content:
      "向量数据库是专门用于存储和检索高维向量数据的数据库系统。它们在语义搜索、推荐系统和 RAG（检索增强生成）应用中非常有用。",
    metadata: { source: "vector-db-intro", category: "数据库" },
  },
  {
    content:
      "Embedding 是将文本、图像等数据转换为高维向量的过程。这些向量能够捕捉语义信息，相似的内容会有相近的向量表示。",
    metadata: { source: "ml-basics", category: "机器学习" },
  },
  {
    content:
      "tRPC 是一个端到端类型安全的 RPC 框架。它允许你在前后端之间共享类型定义，无需手动编写 API 接口文档。",
    metadata: { source: "trpc-docs", category: "后端框架" },
  },
  {
    content:
      "Redis 是一个开源的内存数据结构存储系统，可用作数据库、缓存和消息代理。它支持字符串、哈希、列表、集合等多种数据结构。",
    metadata: { source: "redis-manual", category: "数据库" },
  },
  {
    content:
      "Vue.js 是一个渐进式 JavaScript 框架，用于构建用户界面。它的核心库只关注视图层，易于上手，同时也便于与第三方库整合。",
    metadata: { source: "vue-docs", category: "前端框架" },
  },
  {
    content:
      "Kubernetes 是一个开源的容器编排平台，用于自动化部署、扩展和管理容器化应用程序。它提供了服务发现、负载均衡和自动伸缩等功能。",
    metadata: { source: "k8s-docs", category: "容器编排" },
  },
];

// ============================================================
// 主程序
// ============================================================

async function main() {
  console.log("🚀 向量数据库演示脚本启动（真实 Embedding 版本）\n");

  // 1. 初始化 Embedding 服务
  const embeddingService = new EmbeddingService(EMBEDDING_MODEL);
  await embeddingService.initialize();

  // 2. 初始化数据库存储
  const store = new VectorDocumentStore(DB_CONFIG, embeddingService);

  try {
    // 3. 初始化数据库表（重建以匹配 384 维向量）
    console.log("📋 初始化数据库表...");
    await store.initializeTable();

    // 4. 插入 mock 文档
    console.log("📝 插入 mock 文档数据（生成真实 embedding）...");
    const insertedIds = await store.insertDocuments(MOCK_DOCUMENTS);
    console.log(`✅ 成功插入 ${insertedIds.length} 条文档\n`);

    // 5. 演示相似度搜索
    const queries = [
      "什么是 TypeScript？静态类型有什么好处？",
      "如何使用向量数据库进行语义搜索？",
      "前端开发用什么框架比较好？",
      "容器化部署有哪些工具？",
      "数据库有哪些类型？",
    ];

    console.log("=".repeat(70));
    console.log("🔍 开始相似度检索测试");
    console.log("=".repeat(70));

    for (const query of queries) {
      console.log(`\n📌 查询: "${query}"`);
      console.log("-".repeat(60));

      const results = await store.similaritySearch(query, 3, 0.3);

      if (results.length === 0) {
        console.log("  ❌ 未找到相关文档（相似度阈值: 0.3）");
      } else {
        results.forEach((doc, index) => {
          const similarity = (doc.similarity * 100).toFixed(2);
          const preview =
            doc.content.length > 70
              ? doc.content.slice(0, 70) + "..."
              : doc.content;
          // metadata 可能是字符串（需解析）或已解析对象
          const meta =
            typeof doc.metadata === "string"
              ? (JSON.parse(doc.metadata) as DocumentMetadata)
              : doc.metadata;
          console.log(`  ${index + 1}. [相似度: ${similarity}%] ${preview}`);
          console.log(`     📁 分类: ${meta.category} | 来源: ${meta.source}`);
        });
      }
    }

    // 6. 显示统计信息
    const count = await store.getDocumentCount();
    console.log(`\n${"=".repeat(70)}`);
    console.log(
      `📊 数据库统计: 共 ${count} 条文档，向量维度: ${VECTOR_DIMENSION}`
    );
    console.log(`🤖 使用模型: ${EMBEDDING_MODEL}`);
  } catch (error) {
    console.error("❌ 执行出错:", error);
    throw error;
  } finally {
    await store.close();
    console.log("\n👋 数据库连接已关闭");
  }
}

// 执行主程序
main().catch(console.error);
