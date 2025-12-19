# @rapid-push/sdk

React Native 热更新 SDK，与 Rapid Push 服务端配合使用。

## 安装

```bash
# npm
npm install @rapid-push/sdk

# yarn
yarn add @rapid-push/sdk

# pnpm
pnpm add @rapid-push/sdk
```

### Peer Dependencies

SDK 依赖以下包，请确保项目中已安装：

```bash
pnpm add expo-updates expo-constants @react-native-async-storage/async-storage
```

## 快速开始

### 1. 配置 Provider

在 App 入口处包裹 `RapidPushProvider`：

```tsx
import { RapidPushProvider } from '@rapid-push/sdk';

export default function App() {
  return (
    <RapidPushProvider
      config={{
        serverUrl: 'https://your-server.com',
        projectId: 'your-project-id',
        channelId: 'your-channel-id',
      }}
    >
      <MainApp />
    </RapidPushProvider>
  );
}
```

### 2. 使用 Hooks 检查更新

```tsx
import { useUpdates, useCurrentUpdate } from '@rapid-push/sdk';

function UpdateScreen() {
  const {
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    checkForUpdate,
    downloadUpdate,
    applyUpdate,
  } = useUpdates();

  const currentUpdate = useCurrentUpdate();

  // 检查更新
  const handleCheck = async () => {
    const result = await checkForUpdate();
    if (result.type === 'updateAvailable') {
      console.log('发现新版本:', result.manifest.id);
    }
  };

  // 下载并应用更新
  const handleDownloadAndApply = async () => {
    await downloadUpdate();
    await applyUpdate(); // 会重启应用
  };

  return (
    <View>
      <Text>当前版本: {currentUpdate?.manifest?.id ?? '无'}</Text>

      {updateInfo?.type === 'updateAvailable' && (
        <View>
          <Text>发现新版本: {updateInfo.manifest.id}</Text>
          <Button title="下载更新" onPress={handleDownloadAndApply} />
        </View>
      )}

      {isDownloading && (
        <Text>下载中: {Math.round(downloadProgress * 100)}%</Text>
      )}
    </View>
  );
}
```

## API 参考

### RapidPushProvider

Provider 组件，提供 SDK 上下文。

#### Props

| 属性       | 类型              | 必填 | 说明     |
| ---------- | ----------------- | ---- | -------- |
| `config`   | `RapidPushConfig` | 是   | SDK 配置 |
| `children` | `ReactNode`       | 是   | 子组件   |

### RapidPushConfig

```typescript
interface RapidPushConfig {
  /** 服务器地址 */
  serverUrl: string;
  /** 项目 ID */
  projectId: string;
  /** 渠道 ID */
  channelId: string;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 请求超时 (ms)，默认 30000 */
  timeout?: number;
  /** 是否启用调试日志 */
  debug?: boolean;
}
```

### useUpdates()

管理更新的核心 Hook。

#### 返回值

```typescript
interface UseUpdatesReturn {
  /** 更新检查结果 */
  updateInfo: UpdateCheckResult | null;
  /** 是否正在检查更新 */
  isChecking: boolean;
  /** 是否正在下载 */
  isDownloading: boolean;
  /** 下载进度 (0-1) */
  downloadProgress: number;
  /** 错误信息 */
  error: Error | null;
  /** 检查更新 */
  checkForUpdate: () => Promise<UpdateCheckResult>;
  /** 下载更新 */
  downloadUpdate: () => Promise<void>;
  /** 应用更新（重启） */
  applyUpdate: () => Promise<void>;
  /** 忽略当前更新 */
  dismissUpdate: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}
```

### useCurrentUpdate()

获取当前运行的更新信息。

#### 返回值

```typescript
interface CurrentUpdateInfo {
  /** 当前 Manifest */
  manifest: Manifest | null;
  /** 是否在开发模式 */
  isEmbedded: boolean;
  /** 渠道名 */
  channel: string | null;
}
```

### useDeviceInfo()

获取设备信息。

#### 返回值

```typescript
interface DeviceInfo {
  /** 设备唯一 ID */
  deviceId: string;
  /** 平台 */
  platform: 'ios' | 'android';
  /** 平台版本 */
  platformVersion: string;
  /** 应用版本 */
  appVersion: string;
  /** 运行时版本 */
  runtimeVersion: string;
}
```

## 命令式 API

对于不使用 React 的场景，可以直接使用 `RapidPush` 类：

```typescript
import { RapidPush } from '@rapid-push/sdk';

const rapidPush = new RapidPush({
  serverUrl: 'https://your-server.com',
  projectId: 'your-project-id',
  channelId: 'your-channel-id',
});

// 初始化
await rapidPush.initialize();

// 检查更新
const result = await rapidPush.checkForUpdate();

if (result.type === 'updateAvailable') {
  // 下载更新
  await rapidPush.downloadUpdate(result.manifest, progress => {
    console.log(`下载进度: ${progress * 100}%`);
  });

  // 应用更新
  await rapidPush.applyUpdate();
}

// 销毁
rapidPush.destroy();
```

## 类型导出

SDK 导出了所有必要的类型：

```typescript
import type {
  // 配置
  RapidPushConfig,
  // 协议类型
  Manifest,
  ManifestAsset,
  Directive,
  UpdateCheckResult,
  // 状态类型
  UpdateState,
  DeviceInfo,
  CurrentUpdateInfo,
  DownloadProgress,
} from '@rapid-push/sdk';
```
