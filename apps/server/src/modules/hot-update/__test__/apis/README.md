# API 测试集

使用最新代码结构重新组织的测试场景。

## 测试场景

### 1. 基础工作流 (00-basic-workflow)

- [x] 00-setup.ts - 初始化测试环境
- [x] 01-upload.ts - 上传 Bundle
- [x] 02-check.ts - 检查更新
- [x] 99-cleanup.ts - 清理

### 2. 灰度发布 (01-gray-release)

- [x] 00-setup.ts - 准备环境
- [x] 01-upload.ts - 上传更新
- [x] 02-create-rules.ts - 创建灰度规则
- [x] 03-test-rollout.ts - 测试灰度匹配
- [x] 99-cleanup.ts - 清理

### 3. 回滚 (02-rollback)

- [x] 00-setup.ts - 准备环境
- [x] 01-upload-v1.ts - 上传 v1
- [x] 02-upload-v2.ts - 上传 v2
- [x] 03-create-directive.ts - 创建回滚指令
- [x] 04-check-directive.ts - 验证指令
- [x] 99-cleanup.ts - 清理

### 4. 代码签名 (03-signing)

- [x] 00-setup.ts - 准备环境
- [x] 01-set-signing-keys.ts - 设置密钥
- [x] 02-upload-signed.ts - 上传签名更新
- [x] 03-verify-signature.ts - 验证签名
- [x] 04-disable-signing.ts - 禁用签名
- [x] 99-cleanup.ts - 清理

### 5. Manifest Filters (04-filters)

- [x] 00-setup.ts - 准备环境
- [x] 01-configure-filters.ts - 配置过滤键
- [x] 02-upload-with-metadata.ts - 上传带元数据的更新
- [x] 03-check-filters.ts - 验证过滤器
- [x] 99-cleanup.ts - 清理

### 6. 压缩支持 (05-compression)

- [x] 00-setup.ts - 准备环境
- [x] 01-upload-asset.ts - 上传资源
- [x] 02-test-gzip.ts - 测试 gzip 压缩
- [x] 03-test-no-compression.ts - 测试无压缩
- [x] 99-cleanup.ts - 清理

## 运行所有测试

```bash
# 基础工作流
bun run src/modules/hot-update/__test__/apis/00-basic-workflow/00-setup.ts
bun run src/modules/hot-update/__test__/apis/00-basic-workflow/01-upload.ts
bun run src/modules/hot-update/__test__/apis/00-basic-workflow/02-check.ts
bun run src/modules/hot-update/__test__/apis/00-basic-workflow/99-cleanup.ts

# 其他场景类似...
```

## 注意事项

- 所有测试使用共享的 TestContext
- 测试遵循最新的 API 结构
- 每个场景独立，可单独运行
- 使用 00-setup.ts 初始化，99-cleanup.ts 清理
