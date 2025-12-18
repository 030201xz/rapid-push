/**
 * 带版本控制的向量文档系统
 *
 * 核心特性：
 * 1. 同一功能文档共享 feature_id (UUIDv4)
 * 2. 每个版本有独立的 version 序号
 * 3. 相似度搜索时，新版本权重更高（版本衰减因子）
 *
 * 使用模型：Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384维)
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
  changelog?: string; // 版本变更说明
}

/** 带版本的文档记录 */
interface VersionedDocument {
  id: number;
  feature_id: string; // UUIDv4，同一功能的所有版本共享
  version: number; // 版本号，从 1 开始递增
  content: string;
  metadata: DocumentMetadata;
  embedding: string;
  is_latest: boolean; // 是否为最新版本
  created_at: Date;
}

/** 带权重的相似度搜索结果 */
interface WeightedSimilarityResult extends VersionedDocument {
  raw_similarity: number; // 原始相似度
  version_weight: number; // 版本权重
  weighted_similarity: number; // 加权后的相似度
}

/** 数据库配置 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/** 版本衰减配置 */
interface VersionDecayConfig {
  /** 衰减系数，每个旧版本相似度乘以 (1 - decayRate)^(latestVersion - currentVersion) */
  decayRate: number;
  /** 最小权重，防止旧版本权重过低 */
  minWeight: number;
}

// ============================================================
// 配置常量
// ============================================================

const DB_CONFIG: DatabaseConfig = {
  host: "localhost",
  port: 5433,
  database: "vector_db",
  username: "postgres",
  password: "postgres123",
};

/** Embedding 模型配置 */
const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const VECTOR_DIMENSION = 384;

/** 版本衰减配置：每个旧版本降低 15%，最低保留 30% 权重 */
const VERSION_DECAY_CONFIG: VersionDecayConfig = {
  decayRate: 0.15,
  minWeight: 0.3,
};

// ============================================================
// Embedding 服务
// ============================================================

class EmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null;
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async initialize(): Promise<void> {
    if (this.extractor) return;

    console.log(`📦 正在加载 embedding 模型: ${this.modelName}`);
    console.log("   首次运行会自动下载模型，请稍候...\n");

    this.extractor = await pipeline("feature-extraction", this.modelName, {
      dtype: "fp32",
    });

    console.log("✅ Embedding 模型加载完成\n");
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error("Embedding 服务未初始化");
    }

    const output = await this.extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output.data as Float32Array);
  }
}

// ============================================================
// 带版本控制的文档存储
// ============================================================

class VersionedDocumentStore {
  private sql: postgres.Sql;
  private embeddingService: EmbeddingService;
  private decayConfig: VersionDecayConfig;

  constructor(
    config: DatabaseConfig,
    embeddingService: EmbeddingService,
    decayConfig: VersionDecayConfig
  ) {
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
    });
    this.embeddingService = embeddingService;
    this.decayConfig = decayConfig;
  }

  /**
   * 初始化数据库表
   */
  async initializeTable(): Promise<void> {
    await this.sql`DROP TABLE IF EXISTS versioned_documents CASCADE`;

    await this.sql.unsafe(`
      CREATE TABLE versioned_documents (
        id SERIAL PRIMARY KEY,
        feature_id UUID NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        embedding vector(384),
        is_latest BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- 同一 feature_id 下版本号唯一
        UNIQUE(feature_id, version)
      )
    `);

    // 创建索引
    await this.sql`
      CREATE INDEX versioned_docs_embedding_idx 
      ON versioned_documents 
      USING hnsw (embedding vector_cosine_ops)
    `;

    await this.sql`
      CREATE INDEX versioned_docs_feature_idx 
      ON versioned_documents (feature_id)
    `;

    await this.sql`
      CREATE INDEX versioned_docs_latest_idx 
      ON versioned_documents (is_latest) WHERE is_latest = true
    `;

    console.log("✅ 数据库表已初始化（带版本控制）\n");
  }

  /**
   * 创建新文档（首个版本）
   * @returns feature_id
   */
  async createDocument(
    content: string,
    metadata: DocumentMetadata
  ): Promise<string> {
    const embedding = await this.embeddingService.generateEmbedding(content);
    const embeddingStr = pgvector.toSql(embedding);

    const result = await this.sql<{ feature_id: string }[]>`
      INSERT INTO versioned_documents (feature_id, version, content, metadata, embedding, is_latest)
      VALUES (gen_random_uuid(), 1, ${content}, ${JSON.stringify(metadata)}, ${embeddingStr}::vector, true)
      RETURNING feature_id::text
    `;

    const row = result[0];
    if (!row) throw new Error("创建文档失败");
    return row.feature_id;
  }

  /**
   * 为现有文档添加新版本
   * 自动将旧版本的 is_latest 设为 false
   */
  async addVersion(
    featureId: string,
    content: string,
    metadata: DocumentMetadata
  ): Promise<number> {
    const embedding = await this.embeddingService.generateEmbedding(content);
    const embeddingStr = pgvector.toSql(embedding);

    // 使用事务确保原子性
    const newVersion = await this.sql.begin(async (tx) => {
      // 1. 获取当前最大版本号
      const versionResult = await tx<{ max_version: number | null }[]>`
        SELECT MAX(version) as max_version 
        FROM versioned_documents 
        WHERE feature_id = ${featureId}::uuid
      `;

      const currentMaxVersion = versionResult[0]?.max_version ?? 0;
      if (currentMaxVersion === 0) {
        throw new Error(`Feature ${featureId} 不存在`);
      }

      const nextVersion = currentMaxVersion + 1;

      // 2. 将所有旧版本标记为非最新
      await tx`
        UPDATE versioned_documents 
        SET is_latest = false 
        WHERE feature_id = ${featureId}::uuid
      `;

      // 3. 插入新版本
      await tx`
        INSERT INTO versioned_documents (feature_id, version, content, metadata, embedding, is_latest)
        VALUES (${featureId}::uuid, ${nextVersion}, ${content}, ${JSON.stringify(metadata)}, ${embeddingStr}::vector, true)
      `;

      return nextVersion;
    });

    return newVersion;
  }

  /**
   * 计算版本权重
   * 使用指数衰减：weight = max(minWeight, (1 - decayRate)^(latestVersion - version))
   */
  private calculateVersionWeight(
    version: number,
    latestVersion: number
  ): number {
    const versionDiff = latestVersion - version;
    const weight = Math.pow(1 - this.decayConfig.decayRate, versionDiff);
    return Math.max(this.decayConfig.minWeight, weight);
  }

  /**
   * 带版本权重的相似度搜索
   * @param queryText - 查询文本
   * @param limit - 返回数量
   * @param includeAllVersions - 是否包含所有版本（默认仅搜索最新版本）
   */
  async similaritySearch(
    queryText: string,
    limit = 5,
    includeAllVersions = false
  ): Promise<WeightedSimilarityResult[]> {
    const queryEmbedding =
      await this.embeddingService.generateEmbedding(queryText);
    const embeddingStr = pgvector.toSql(queryEmbedding);

    // 构建查询条件
    const latestOnlyCondition = includeAllVersions
      ? this.sql``
      : this.sql`AND is_latest = true`;

    // 获取原始相似度结果
    const rawResults = await this.sql<
      Array<VersionedDocument & { raw_similarity: number }>
    >`
      SELECT 
        id,
        feature_id::text,
        version,
        content,
        metadata,
        embedding::text,
        is_latest,
        created_at,
        1 - (embedding <=> ${embeddingStr}::vector) as raw_similarity
      FROM versioned_documents
      WHERE 1 = 1 ${latestOnlyCondition}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit * 3}
    `;

    // 如果搜索所有版本，需要获取每个 feature 的最新版本号
    const featureLatestVersions = new Map<string, number>();

    if (includeAllVersions && rawResults.length > 0) {
      const featureIds = [...new Set(rawResults.map((r) => r.feature_id))];
      const latestVersions = await this.sql<
        { feature_id: string; latest_version: number }[]
      >`
        SELECT feature_id::text, MAX(version) as latest_version
        FROM versioned_documents
        WHERE feature_id = ANY(${featureIds}::uuid[])
        GROUP BY feature_id
      `;
      latestVersions.forEach((row) => {
        featureLatestVersions.set(row.feature_id, row.latest_version);
      });
    }

    // 计算加权相似度
    const weightedResults: WeightedSimilarityResult[] = rawResults.map(
      (doc) => {
        const latestVersion = includeAllVersions
          ? (featureLatestVersions.get(doc.feature_id) ?? doc.version)
          : doc.version; // 仅最新版本时，version 就是 latest

        const versionWeight = this.calculateVersionWeight(
          doc.version,
          latestVersion
        );
        const weightedSimilarity = doc.raw_similarity * versionWeight;

        return {
          ...doc,
          version_weight: versionWeight,
          weighted_similarity: weightedSimilarity,
        };
      }
    );

    // 按加权相似度排序并截取
    return weightedResults
      .sort((a, b) => b.weighted_similarity - a.weighted_similarity)
      .slice(0, limit);
  }

  /**
   * 智能搜索：先匹配最相关的功能，再展开该功能的历史版本
   *
   * 逻辑：
   * 1. 用最新版本匹配找到最相关的 N 个功能（feature）
   * 2. 对于每个匹配的功能，拉取其所有历史版本
   * 3. 按版本权重排序展示
   *
   * @param queryText - 查询文本
   * @param featureLimit - 返回的功能数量
   * @param expandVersions - 是否展开历史版本
   */
  async smartSearch(
    queryText: string,
    featureLimit = 3,
    expandVersions = true
  ): Promise<WeightedSimilarityResult[]> {
    const queryEmbedding =
      await this.embeddingService.generateEmbedding(queryText);
    const embeddingStr = pgvector.toSql(queryEmbedding);

    // Step 1: 先找到最相关的 N 个功能（仅最新版本参与匹配）
    const topFeatures = await this.sql<
      { feature_id: string; raw_similarity: number }[]
    >`
      SELECT 
        feature_id::text,
        1 - (embedding <=> ${embeddingStr}::vector) as raw_similarity
      FROM versioned_documents
      WHERE is_latest = true
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${featureLimit}
    `;

    if (topFeatures.length === 0) return [];

    // Step 2: 获取这些功能的所有版本
    const featureIds = topFeatures.map((f) => f.feature_id);
    const featureSimilarityMap = new Map(
      topFeatures.map((f) => [f.feature_id, f.raw_similarity])
    );

    const allVersions = await this.sql<VersionedDocument[]>`
      SELECT 
        id,
        feature_id::text,
        version,
        content,
        metadata,
        embedding::text,
        is_latest,
        created_at
      FROM versioned_documents
      WHERE feature_id = ANY(${featureIds}::uuid[])
      ORDER BY feature_id, version DESC
    `;

    // Step 3: 获取每个 feature 的最新版本号
    const featureLatestVersions = new Map<string, number>();
    for (const doc of allVersions) {
      if (!featureLatestVersions.has(doc.feature_id)) {
        featureLatestVersions.set(doc.feature_id, doc.version);
      }
    }

    // Step 4: 计算每个版本的加权相似度
    // 注意：用该功能最新版本的相似度作为基准，历史版本按权重衰减
    const results: WeightedSimilarityResult[] = allVersions.map((doc) => {
      const baseSimliarity = featureSimilarityMap.get(doc.feature_id) ?? 0;
      const latestVersion =
        featureLatestVersions.get(doc.feature_id) ?? doc.version;
      const versionWeight = this.calculateVersionWeight(
        doc.version,
        latestVersion
      );
      const weightedSimilarity = baseSimliarity * versionWeight;

      return {
        ...doc,
        raw_similarity: baseSimliarity,
        version_weight: versionWeight,
        weighted_similarity: weightedSimilarity,
      };
    });

    // Step 5: 按加权相似度排序
    // 如果不展开版本，只返回每个功能的最新版本
    if (!expandVersions) {
      return results
        .filter((r) => r.is_latest)
        .sort((a, b) => b.weighted_similarity - a.weighted_similarity);
    }

    return results.sort(
      (a, b) => b.weighted_similarity - a.weighted_similarity
    );
  }

  /**
   * 获取某个功能的所有版本
   */
  async getFeatureVersions(featureId: string): Promise<VersionedDocument[]> {
    return this.sql<VersionedDocument[]>`
      SELECT 
        id,
        feature_id::text,
        version,
        content,
        metadata,
        is_latest,
        created_at
      FROM versioned_documents
      WHERE feature_id = ${featureId}::uuid
      ORDER BY version DESC
    `;
  }

  /**
   * 获取文档统计
   */
  async getStats(): Promise<{
    total_docs: number;
    unique_features: number;
    avg_versions: number;
  }> {
    const result = await this.sql<
      { total_docs: string; unique_features: string; avg_versions: string }[]
    >`
      SELECT 
        COUNT(*) as total_docs,
        COUNT(DISTINCT feature_id) as unique_features,
        ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT feature_id), 0), 2) as avg_versions
      FROM versioned_documents
    `;

    const row = result[0];
    if (!row) throw new Error("获取统计失败");

    return {
      total_docs: parseInt(row.total_docs, 10),
      unique_features: parseInt(row.unique_features, 10),
      avg_versions: parseFloat(row.avg_versions) || 0,
    };
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}

// ============================================================
// 演示数据：模拟功能文档的版本迭代
// ============================================================

interface FeatureDocumentSeries {
  initialContent: string;
  metadata: DocumentMetadata;
  versions: Array<{ content: string; changelog: string }>;
}

/** 模拟功能文档及其版本迭代 */
const FEATURE_DOCUMENTS: FeatureDocumentSeries[] = [
  {
    initialContent: "用户登录功能：支持用户名密码登录，验证后返回 JWT Token。",
    metadata: { source: "auth-module", category: "认证" },
    versions: [
      {
        content:
          "用户登录功能：支持用户名密码登录和手机验证码登录，验证后返回 JWT Token，包含刷新令牌机制。",
        changelog: "新增手机验证码登录，添加刷新令牌",
      },
      {
        content:
          "用户登录功能：支持用户名密码、手机验证码、OAuth2.0（微信/Google）三种登录方式。验证后返回 JWT Token，支持刷新令牌和多设备管理。",
        changelog: "新增 OAuth2.0 第三方登录，支持多设备管理",
      },
    ],
  },
  {
    initialContent:
      "订单创建接口：用户提交商品列表，系统生成订单并返回订单号。",
    metadata: { source: "order-module", category: "订单" },
    versions: [
      {
        content:
          "订单创建接口：用户提交商品列表和收货地址，系统校验库存后生成订单，支持优惠券抵扣，返回订单号和预计支付金额。",
        changelog: "新增库存校验、优惠券抵扣功能",
      },
    ],
  },
  {
    initialContent: "商品搜索功能：根据关键词搜索商品，返回商品列表。",
    metadata: { source: "product-module", category: "商品" },
    versions: [
      {
        content:
          "商品搜索功能：支持关键词搜索、分类筛选、价格区间过滤，返回分页商品列表，支持按销量/价格/评分排序。",
        changelog: "新增筛选、排序、分页功能",
      },
      {
        content:
          "商品搜索功能：支持关键词搜索（含同义词扩展）、分类筛选、价格区间、品牌筛选，返回分页商品列表。支持多种排序方式，新增智能推荐和搜索建议。",
        changelog: "新增同义词扩展、品牌筛选、智能推荐",
      },
      {
        content:
          "商品搜索功能：基于向量数据库的语义搜索，支持自然语言查询。保留传统筛选条件（分类/价格/品牌），融合关键词匹配与语义相似度，提供更精准的搜索结果。",
        changelog: "重构为语义搜索，融合向量检索与关键词匹配",
      },
    ],
  },
];

// ============================================================
// 主程序
// ============================================================

async function main() {
  console.log("🚀 带版本控制的向量文档系统演示\n");

  // 初始化服务
  const embeddingService = new EmbeddingService(EMBEDDING_MODEL);
  await embeddingService.initialize();

  const store = new VersionedDocumentStore(
    DB_CONFIG,
    embeddingService,
    VERSION_DECAY_CONFIG
  );

  try {
    // 初始化数据库
    console.log("📋 初始化数据库表...");
    await store.initializeTable();

    // 插入功能文档及其版本
    console.log("📝 插入功能文档及版本...\n");
    const featureIds: string[] = [];

    for (const feature of FEATURE_DOCUMENTS) {
      // 创建初始版本
      const featureId = await store.createDocument(
        feature.initialContent,
        feature.metadata
      );
      featureIds.push(featureId);
      console.log(`  ✅ 创建功能 [${feature.metadata.category}] v1`);
      console.log(`     Feature ID: ${featureId}`);

      // 添加后续版本
      for (let i = 0; i < feature.versions.length; i++) {
        const versionData = feature.versions[i];
        if (!versionData) continue;

        const newVersion = await store.addVersion(
          featureId,
          versionData.content,
          {
            ...feature.metadata,
            changelog: versionData.changelog,
          }
        );
        console.log(`     → 添加 v${newVersion}: ${versionData.changelog}`);
      }
      console.log();
    }

    // 显示统计
    const stats = await store.getStats();
    console.log("📊 数据统计:");
    console.log(`   总文档数: ${stats.total_docs}`);
    console.log(`   功能数: ${stats.unique_features}`);
    console.log(`   平均版本数: ${stats.avg_versions}\n`);

    // 演示相似度搜索
    console.log("=".repeat(70));
    console.log("🔍 智能搜索测试（匹配功能 + 展开历史版本）");
    console.log("=".repeat(70));

    const queries = [
      "如何实现用户登录？支持哪些登录方式？",
      "商品搜索支持语义搜索吗？",
      "创建订单时可以使用优惠券吗？",
    ];

    for (const query of queries) {
      console.log(`\n📌 查询: "${query}"`);
      console.log("-".repeat(60));

      // 使用 smartSearch：先匹配功能，再展开历史版本
      const results = await store.smartSearch(query, 1, true); // 只匹配1个功能，展开所有版本

      results.forEach((doc, index) => {
        const meta =
          typeof doc.metadata === "string"
            ? (JSON.parse(doc.metadata) as DocumentMetadata)
            : doc.metadata;
        const preview =
          doc.content.length > 70
            ? doc.content.slice(0, 70) + "..."
            : doc.content;
        const latest = doc.is_latest ? " 🏷️最新" : "";

        console.log(
          `  ${index + 1}. v${doc.version}${latest} [基准: ${(doc.raw_similarity * 100).toFixed(1)}% × 权重: ${(doc.version_weight * 100).toFixed(0)}% = ${(doc.weighted_similarity * 100).toFixed(2)}%]`
        );
        console.log(`     ${preview}`);
        if (meta.changelog) {
          console.log(`     📝 ${meta.changelog}`);
        }
      });
    }

    // 演示：搜索所有版本（含版本权重）
    console.log("\n" + "=".repeat(70));
    console.log("🔍 相似度搜索测试（所有版本 + 版本权重）");
    console.log("=".repeat(70));

    const allVersionQuery = "商品搜索功能有哪些？";
    console.log(`\n📌 查询: "${allVersionQuery}"`);
    console.log("-".repeat(60));

    const allVersionResults = await store.similaritySearch(
      allVersionQuery,
      6,
      true
    );

    allVersionResults.forEach((doc, index) => {
      const meta =
        typeof doc.metadata === "string"
          ? (JSON.parse(doc.metadata) as DocumentMetadata)
          : doc.metadata;
      const preview =
        doc.content.length > 60
          ? doc.content.slice(0, 60) + "..."
          : doc.content;

      console.log(
        `  ${index + 1}. v${doc.version} [原始: ${(doc.raw_similarity * 100).toFixed(1)}% × 权重: ${(doc.version_weight * 100).toFixed(0)}% = ${(doc.weighted_similarity * 100).toFixed(2)}%]`
      );
      console.log(`     ${preview}`);
      if (meta.changelog) {
        console.log(`     📝 变更: ${meta.changelog}`);
      }
    });

    // 显示某个功能的版本历史
    if (featureIds[2]) {
      console.log("\n" + "=".repeat(70));
      console.log("📜 功能版本历史（商品搜索）");
      console.log("=".repeat(70));

      const versions = await store.getFeatureVersions(featureIds[2]);
      versions.forEach((v) => {
        const meta =
          typeof v.metadata === "string"
            ? (JSON.parse(v.metadata) as DocumentMetadata)
            : v.metadata;
        const latest = v.is_latest ? " 🏷️ 最新" : "";
        console.log(`\n  v${v.version}${latest}`);
        console.log(`  ${v.content}`);
        if (meta.changelog) {
          console.log(`  📝 ${meta.changelog}`);
        }
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log(`🤖 使用模型: ${EMBEDDING_MODEL}`);
    console.log(
      `⚙️ 版本衰减配置: 衰减率=${VERSION_DECAY_CONFIG.decayRate}, 最小权重=${VERSION_DECAY_CONFIG.minWeight}`
    );
  } catch (error) {
    console.error("❌ 执行出错:", error);
    throw error;
  } finally {
    await store.close();
    console.log("\n👋 数据库连接已关闭");
  }
}

main().catch(console.error);
