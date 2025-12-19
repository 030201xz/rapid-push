-- ================================================
-- Rapid S 数据库初始化脚本
-- 创建 rapid_s schema 供应用使用
-- ================================================

-- 创建 rapid_s schema（如果不存在）
CREATE SCHEMA IF NOT EXISTS rapid_s;

-- 授予 postgres 用户该 schema 的所有权限
GRANT ALL ON SCHEMA rapid_s TO postgres;

-- 设置默认搜索路径包含 rapid_s
ALTER DATABASE rapid_s SET search_path TO rapid_s, public;

COMMENT ON SCHEMA rapid_s IS 'Rapid S 应用主 Schema';
