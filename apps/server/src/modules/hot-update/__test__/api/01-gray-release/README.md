# 01-gray-release: 灰度发布场景

测试热更新服务的灰度发布功能。

## 场景描述

模拟分阶段灰度发布流程：

1. 上传新版本并设置 50% 基础灰度
2. 创建设备白名单规则（VIP 用户优先）
3. 创建百分比规则进一步控制
4. 验证不同设备的更新分发情况

## 灰度策略说明

| 规则类型       | 优先级    | 效果                   |
| -------------- | --------- | ---------------------- |
| 设备 ID 白名单 | 1（最高） | VIP 设备 100% 收到更新 |
| 百分比规则     | 2         | 额外 30% 用户收到更新  |
| 基础灰度       | -         | 剩余用户按 50% 比例    |

## 测试步骤

| 步骤 | 文件                 | 说明                       |
| ---- | -------------------- | -------------------------- |
| 00   | `00-setup.ts`        | 环境准备                   |
| 01   | `01-upload.ts`       | 上传更新并设置 50% 灰度    |
| 02   | `02-create-rules.ts` | 创建设备白名单和百分比规则 |
| 03   | `03-verify.ts`       | 验证灰度效果               |
| 99   | `99-cleanup.ts`      | 清理测试数据               |

## 运行方式

```bash
cd apps/server

# 按步骤运行
bun run src/modules/hot-update/__test__/api/01-gray-release/00-setup.ts
bun run src/modules/hot-update/__test__/api/01-gray-release/01-upload.ts
bun run src/modules/hot-update/__test__/api/01-gray-release/02-create-rules.ts
bun run src/modules/hot-update/__test__/api/01-gray-release/03-verify.ts

# 清理
bun run src/modules/hot-update/__test__/api/01-gray-release/99-cleanup.ts
```

## 一键运行

```bash
cd apps/server
bun run src/modules/hot-update/__test__/api/01-gray-release/00-setup.ts && \
bun run src/modules/hot-update/__test__/api/01-gray-release/01-upload.ts && \
bun run src/modules/hot-update/__test__/api/01-gray-release/02-create-rules.ts && \
bun run src/modules/hot-update/__test__/api/01-gray-release/03-verify.ts
```

## 覆盖的 API

- `hotUpdate.manage.updates.upload` - 上传更新
- `hotUpdate.manage.updates.updateSettings` - 修改灰度比例
- `hotUpdate.manage.rolloutRules.createDeviceId` - 创建设备白名单规则
- `hotUpdate.manage.rolloutRules.createPercentage` - 创建百分比规则
- `hotUpdate.manage.rolloutRules.listByUpdate` - 查询规则列表
- `hotUpdate.manage.rolloutRules.deleteByUpdate` - 删除规则
- `hotUpdate.protocol.manifest.check` - 检查更新（验证灰度）

## 预期结果

- VIP 设备（3 个）：100% 收到更新
- 普通设备（20 个样本）：约 50% 收到更新（±20% 波动）
