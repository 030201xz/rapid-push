# @rapid-s/sdk

React Native 热更新 SDK - 基于 expo-updates 的轻量封装，提供完整的 TypeScript 类型支持。

## 特性

- 🔄 **薄封装设计** - 基于成熟的 expo-updates，仅添加必要的类型增强和状态管理
- 📦 **类型安全** - 端到端类型复用，与服务端类型保持一致
- ⚛️ **React Hooks** - 提供 `useUpdater`、`useUpdateInfo` 等便捷 Hook
- 📊 **统计上报** - 内置更新事件统计，可配置开关
- 🎯 **灰度支持** - 支持设备 ID、自定义头等灰度规则

## 安装

```bash
# npm
npm install @rapid-s/sdk expo-updates @react-native-async-storage/async-storage

# yarn
yarn add @rapid-s/sdk expo-updates @react-native-async-storage/async-storage

# bun
bun add @rapid-s/sdk expo-updates @react-native-async-storage/async-storage
```

## 环境要求

- Expo SDK 52+
- expo-updates 0.26+
- React 18+
- React Native 0.74+

## 快速开始

### 1. 配置 expo-updates

在 `app.json` 中配置：

```json
{
  "expo": {
    "runtimeVersion": "1.0.0",
    "updates": {
      "url": "https://your-server.com/trpc/hotUpdate.protocol.manifest.check",
      "enabled": true,
      "fallbackToCacheTimeout": 0
    }
  }
}
```

### 2. 添加 Provider

在应用根组件中（如 `app/_layout.tsx`）：

```tsx
import { RapidSProvider } from '@rapid-s/sdk';

export default function RootLayout() {
  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      serverUrl="https://your-server.com"
      checkOnMount={true}
      checkInterval={60000} // 每分钟检查一次
      onUpdateAvailable={(manifest) => {
        console.log('发现新版本:', manifest.id);
      }}
      onError={(error) => {
        console.error('更新错误:', error.message);
      }}
    >
      <App />
    </RapidSProvider>
  );
}
```

### 3. 使用 Hooks

```tsx
import { useUpdater, useUpdateInfo } from '@rapid-s/sdk';

function UpdateScreen() {
  const { state, checkForUpdate, downloadUpdate, applyUpdate, dismissUpdate } = useUpdater();
  const { runtimeVersion, isEmbedded, updateId } = useUpdateInfo();

  return (
    <View>
      <Text>运行时版本: {runtimeVersion}</Text>
      <Text>更新: {isEmbedded ? '内嵌版本' : updateId?.slice(0, 8)}</Text>

      {state.status === 'idle' && (
        <Button onPress={checkForUpdate}>检查更新</Button>
      )}

      {state.status === 'checking' && (
        <ActivityIndicator />
      )}

      {state.status === 'available' && (
        <View>
          <Text>新版本: {state.manifest.metadata.version}</Text>
          <Button onPress={downloadUpdate}>下载</Button>
          <Button onPress={() => dismissUpdate(true)}>忽略</Button>
        </View>
      )}

      {state.status === 'downloading' && (
        <ProgressBar value={state.progress} />
      )}

      {state.status === 'ready' && (
        <Button onPress={applyUpdate}>重启更新</Button>
      )}

      {state.status === 'error' && (
        <Text>错误: {state.error.message}</Text>
      )}
    </View>
  );
}
```

## 状态机

`useUpdater` Hook 返回判别联合类型的状态：

```typescript
type UpdaterState =
  | { status: 'idle' }                                    // 空闲
  | { status: 'checking' }                                // 检查中
  | { status: 'available'; manifest: Manifest }           // 有更新可用
  | { status: 'downloading'; progress: number; manifest: Manifest } // 下载中
  | { status: 'ready'; manifest: Manifest }               // 就绪
  | { status: 'applying'; manifest: Manifest }            // 应用中
  | { status: 'rollback'; directive: Directive }          // 回滚
  | { status: 'error'; error: UpdaterError };             // 错误
```

## Provider 属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `channelKey` | `string` | **必需** | 渠道密钥（从服务端管理后台获取） |
| `serverUrl` | `string` | - | 服务器地址（未提供则从 app.json 读取） |
| `checkOnMount` | `boolean` | `true` | 启动时自动检查更新 |
| `checkInterval` | `number` | `0` | 自动检查间隔（毫秒），0 表示不自动检查 |
| `enableAnalytics` | `boolean` | `true` | 启用统计上报 |
| `deviceId` | `string` | 自动生成 | 设备 ID（用于灰度规则） |
| `customHeaders` | `Record<string, string>` | - | 自定义请求头（用于灰度规则） |
| `onUpdateAvailable` | `(manifest) => void` | - | 有更新可用时回调 |
| `onUpdateDownloaded` | `(manifest) => void` | - | 更新下载完成时回调 |
| `onRollback` | `(directive) => void` | - | 收到回滚指令时回调 |
| `onError` | `(error) => void` | - | 错误发生时回调 |

## 核心 API（非 React）

可在 React 组件外使用或用于测试：

```typescript
import { Updater, checkForUpdate, downloadUpdate, applyUpdate } from '@rapid-s/sdk';

// 检查更新
const manifest = await Updater.checkForUpdate();
if (manifest) {
  console.log('发现更新:', manifest.id);
  
  // 下载
  await Updater.downloadUpdate();
  
  // 应用（会重启应用）
  await Updater.applyUpdate();
}
```

## 统计事件

SDK 自动跟踪并上报以下事件到服务器：

| 事件 | 说明 |
|------|------|
| `update_check` | 检查更新时 |
| `download_start` | 开始下载时 |
| `download_complete` | 下载完成时 |
| `download_failed` | 下载失败时 |
| `apply_success` | 应用成功时 |
| `apply_failed` | 应用失败时 |
| `rollback` | 发生回滚时 |

## 灰度发布

### 按用户分组

```tsx
<RapidSProvider
  channelKey="ch_your_channel_key"
  deviceId={user?.id}
  customHeaders={{
    'x-user-group': user?.isVip ? 'vip' : 'normal',
    'x-region': user?.region ?? 'default',
  }}
>
  <App />
</RapidSProvider>
```

### 按百分比

灰度百分比在服务端配置，SDK 会自动发送 `deviceId`，服务端根据配置的百分比决定是否下发更新。

## 类型导出

SDK 复用服务端类型，保证端到端一致性：

```typescript
import type {
  Manifest,
  ManifestAsset,
  Directive,
  CheckUpdateResponse,
  Platform,
  AnalyticsEvent,
} from '@rapid-s/sdk';
```

## 协议兼容性

SDK 完全兼容 Expo Updates v1 协议：

- ✅ 请求头：`expo-protocol-version`、`expo-platform`、`expo-runtime-version`
- ✅ 响应解析：JSON、multipart/mixed
- ✅ Manifest 结构：id、createdAt、runtimeVersion、launchAsset、assets、metadata、extra
- ✅ Directive 支持：rollBackToEmbedded
- ✅ 代码签名：由 expo-updates 配置控制

## 许可证

MIT
