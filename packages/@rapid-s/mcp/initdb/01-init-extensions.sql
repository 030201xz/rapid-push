-- ================================================
-- MCP PG-PGVector Demo 数据库初始化脚本
-- 仅启用扩展，Schema 和表由 Drizzle 迁移管理
-- ================================================

-- 启用 pgvector 扩展（向量数据库支持）
CREATE EXTENSION IF NOT EXISTS vector;

-- 启用 uuid-ossp 扩展（UUID 生成）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 注意：不在这里创建 Schema，由 Drizzle 迁移管理
-- 这样可以避免与 Drizzle 生成的迁移冲突

-- ================================================
-- 向量存储说明
-- ================================================
-- 向量维度根据使用的 embedding 模型调整：
-- OpenAI text-embedding-3-small: 1536 维
-- OpenAI text-embedding-3-large: 3072 维
-- all-MiniLM-L6-v2 (HuggingFace): 384 维
-- nomic-embed-text: 768 维

COMMENT ON EXTENSION vector IS 'pgvector 向量扩展，支持 AI embedding 存储和相似度检索';
