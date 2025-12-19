# 热更新协议层开发进度

> 最后更新：2025-12-19
> 架构：全 tRPC（v11），自定义 SDK

## 开发阶段总览

| Phase | 模块           | 状态      | 说明                     |
| ----- | -------------- | --------- | ------------------------ |
| 1     | Storage        | ⏳ 进行中 | 存储基础设施             |
| 2     | Bundle Upload  | ⬜ 待开始 | ZIP 解压、FormData 上传  |
| 3     | Manifest       | ⬜ 待开始 | 检查更新、灰度判断、签名 |
| 4     | Asset Download | ⬜ 待开始 | 流式下载                 |
| 5     | Analytics      | ⬜ 待开始 | 事件上报                 |
| 6     | Statistics     | ⬜ 待开始 | 统计管理                 |

---

## Phase 1: 存储基础设施

### 目标

- [x] 创建 TODO.core.md 进度文件
- [ ] 定义 `StorageProvider` 接口
- [ ] 实现 `LocalStorageProvider`
- [ ] 实现 `sha256Base64Url` 哈希函数
- [ ] 添加存储环境变量配置
- [ ] 导出存储模块

### 文件结构

```
src/common/storage/
├── index.ts          # 单例工厂 getStorage()
├── types.ts          # StorageProvider 接口
├── local.ts          # 本地文件系统实现
└── hash.ts           # SHA-256 哈希工具
```

---

## Phase 2: Bundle 上传增强

### 目标

- [ ] 实现 ZIP 解压逻辑
- [ ] 实现资源去重存储（内容寻址）
- [ ] 实现平台检测、launchAsset 识别
- [ ] 新增 `uploadBundle` service 方法
- [ ] 新增 tRPC FormData upload mutation

### 文件结构

```
src/modules/hot-update/updates/
├── service.ts        # 增强：uploadBundle
├── router.ts         # 新增：upload mutation
└── utils/
    ├── bundle.ts     # ZIP 解压
    └── platform.ts   # 平台检测
```

---

## Phase 3: Manifest 协议（tRPC）

### 目标

- [ ] 定义 Manifest 请求/响应类型
- [ ] 实现 Manifest 构建逻辑
- [ ] 实现灰度规则判断
- [ ] 实现代码签名
- [ ] 创建 tRPC 路由

### API 设计

```typescript
manifest.check: publicProcedure
  .input(z.object({
    channelKey: z.string(),
    runtimeVersion: z.string(),
    platform: z.enum(['ios', 'android']),
    currentUpdateId: z.string().optional(),
    deviceId: z.string().optional(),
  }))
  .query(...)
```

### 文件结构

```
src/modules/hot-update/manifest/
├── index.ts
├── schema.ts
├── service.ts
├── router.ts
└── types.ts
```

---

## Phase 4: Asset 下载（流式）

### 目标

- [ ] 增强 assets/service.ts 获取资源流
- [ ] 增强 assets/router.ts 流式下载

### API 设计

```typescript
assets.download: publicProcedure
  .input(z.object({ hash: z.string() }))
  .query(async function* ({ ctx, input }) {
    // 流式返回资源
  })
```

---

## Phase 5: Analytics 事件上报

### 目标

- [ ] 定义事件类型 Schema
- [ ] 实现事件处理、统计更新
- [ ] 创建 tRPC 路由

### API 设计

```typescript
analytics.report: publicProcedure
  .input(z.object({
    channelKey: z.string(),
    events: z.array(analyticsEventSchema),
  }))
  .mutation(...)
```

### 文件结构

```
src/modules/hot-update/analytics/
├── index.ts
├── schema.ts
├── service.ts
├── router.ts
└── types.ts
```

---

## Phase 6: Statistics 管理

### 目标

- [ ] 实现按更新/渠道查询统计
- [ ] 实现历史统计查询
- [ ] 创建 tRPC 路由

### 文件结构

```
src/modules/hot-update/statistics/
├── index.ts
├── service.ts
├── router.ts
└── types.ts
```

---

## 依赖安装

```bash
bun add unzipper mime-types
bun add -D @types/unzipper @types/mime-types
```
