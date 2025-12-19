# @rapid-s/sdk 使用示例

本文档提供 SDK 的完整使用示例。

## 基础集成

### 1. 最小配置

```tsx
// App.tsx
import { RapidSProvider } from '@rapid-s/sdk';
import { MainScreen } from './screens/MainScreen';

export default function App() {
  return (
    <RapidSProvider channelKey="ch_your_channel_key">
      <MainScreen />
    </RapidSProvider>
  );
}
```

### 2. 完整配置

```tsx
// App.tsx
import { RapidSProvider } from '@rapid-s/sdk';
import type { Manifest, Directive, UpdaterError } from '@rapid-s/sdk';

export default function App() {
  // 更新可用回调
  const handleUpdateAvailable = (manifest: Manifest) => {
    console.log('新版本可用:', manifest.metadata.version);
    // 可以在这里显示自定义更新提示
  };

  // 更新下载完成回调
  const handleUpdateDownloaded = (manifest: Manifest) => {
    console.log('更新已下载:', manifest.id);
    // 可以在这里提示用户重启应用
  };

  // 回滚指令回调
  const handleRollback = (directive: Directive) => {
    console.log('收到回滚指令:', directive.type);
    // 处理回滚逻辑
  };

  // 错误回调
  const handleError = (error: UpdaterError) => {
    console.error('更新错误:', error.code, error.message);
    // 上报错误到 Sentry 等服务
  };

  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      serverUrl="https://updates.yourapp.com"
      checkOnMount={true}
      checkInterval={60 * 60 * 1000} // 每小时检查一次
      enableAnalytics={true}
      deviceId="user-123"
      customHeaders={{
        'x-user-group': 'beta',
        'x-region': 'cn',
      }}
      onUpdateAvailable={handleUpdateAvailable}
      onUpdateDownloaded={handleUpdateDownloaded}
      onRollback={handleRollback}
      onError={handleError}
    >
      <MainScreen />
    </RapidSProvider>
  );
}
```

## 更新界面示例

### 基础更新按钮

```tsx
// components/UpdateButton.tsx
import { View, Text, Button, ActivityIndicator } from 'react-native';
import { useUpdater } from '@rapid-s/sdk';

export function UpdateButton() {
  const { state, checkForUpdate, downloadUpdate, applyUpdate, dismissUpdate } = useUpdater();

  switch (state.status) {
    case 'idle':
      return <Button title="检查更新" onPress={checkForUpdate} />;

    case 'checking':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator size="small" />
          <Text style={{ marginLeft: 8 }}>检查中...</Text>
        </View>
      );

    case 'available':
      return (
        <View>
          <Text>发现新版本: v{state.manifest.metadata.version}</Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Button title="下载更新" onPress={downloadUpdate} />
            <Button title="稍后提醒" onPress={() => dismissUpdate(false)} />
            <Button title="忽略此版本" onPress={() => dismissUpdate(true)} />
          </View>
        </View>
      );

    case 'downloading':
      return (
        <View>
          <Text>下载中: {Math.round(state.progress * 100)}%</Text>
          <View
            style={{
              height: 4,
              backgroundColor: '#e0e0e0',
              borderRadius: 2,
              marginTop: 8,
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${state.progress * 100}%`,
                backgroundColor: '#007AFF',
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      );

    case 'ready':
      return (
        <View>
          <Text>更新已就绪</Text>
          <Button title="立即重启" onPress={applyUpdate} />
        </View>
      );

    case 'applying':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ActivityIndicator size="small" />
          <Text style={{ marginLeft: 8 }}>正在重启...</Text>
        </View>
      );

    case 'error':
      return (
        <View>
          <Text style={{ color: 'red' }}>错误: {state.error.message}</Text>
          <Button title="重试" onPress={checkForUpdate} />
        </View>
      );

    default:
      return null;
  }
}
```

### 更新弹窗组件

```tsx
// components/UpdateModal.tsx
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useUpdater } from '@rapid-s/sdk';

export function UpdateModal() {
  const { state, downloadUpdate, applyUpdate, dismissUpdate } = useUpdater();

  // 只在有更新可用或已就绪时显示
  const visible = state.status === 'available' || state.status === 'ready';
  if (!visible) return null;

  const manifest = state.manifest;
  const version = manifest.metadata.version ?? manifest.id.slice(0, 8);
  const releaseNotes = manifest.extra.releaseNotes as string | undefined;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 标题 */}
          <Text style={styles.title}>发现新版本 v{version}</Text>

          {/* 更新日志 */}
          {releaseNotes && <Text style={styles.notes}>{releaseNotes}</Text>}

          {/* 下载进度 */}
          {state.status === 'downloading' && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${state.progress * 100}%` }]} />
            </View>
          )}

          {/* 操作按钮 */}
          <View style={styles.buttons}>
            {state.status === 'available' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => dismissUpdate(false)}
                >
                  <Text style={styles.secondaryText}>稍后</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={downloadUpdate}
                >
                  <Text style={styles.primaryText}>下载</Text>
                </TouchableOpacity>
              </>
            )}

            {state.status === 'ready' && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => dismissUpdate(false)}
                >
                  <Text style={styles.secondaryText}>稍后</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={applyUpdate}
                >
                  <Text style={styles.primaryText}>立即更新</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  primaryText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryText: {
    color: '#333',
  },
});
```

## 设置页面示例

```tsx
// screens/SettingsScreen.tsx
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useUpdateInfo, useUpdater } from '@rapid-s/sdk';

export function SettingsScreen() {
  const { updateId, runtimeVersion, createdAt, isEmbedded } = useUpdateInfo();
  const { state, checkForUpdate } = useUpdater();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>版本信息</Text>

      <View style={styles.row}>
        <Text style={styles.label}>运行时版本</Text>
        <Text style={styles.value}>{runtimeVersion}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>当前版本</Text>
        <Text style={styles.value}>{isEmbedded ? '内嵌版本' : updateId?.slice(0, 8)}</Text>
      </View>

      {createdAt && (
        <View style={styles.row}>
          <Text style={styles.label}>更新时间</Text>
          <Text style={styles.value}>{createdAt.toLocaleString('zh-CN')}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>更新状态</Text>
        <Text style={styles.value}>{getStatusText(state.status)}</Text>
      </View>

      <TouchableOpacity
        style={styles.checkButton}
        onPress={checkForUpdate}
        disabled={state.status === 'checking'}
      >
        <Text style={styles.checkButtonText}>
          {state.status === 'checking' ? '检查中...' : '检查更新'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    idle: '已是最新',
    checking: '检查中',
    available: '有更新可用',
    downloading: '下载中',
    ready: '等待重启',
    applying: '正在更新',
    error: '更新失败',
  };
  return statusMap[status] ?? status;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 16, color: '#333' },
  value: { fontSize: 16, color: '#666' },
  checkButton: {
    marginTop: 24,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkButtonText: { color: 'white', fontSize: 16, fontWeight: '500' },
});
```

## 灰度发布示例

### 按用户分组灰度

```tsx
// App.tsx
import { RapidSProvider } from '@rapid-s/sdk';
import { useCurrentUser } from './hooks/useCurrentUser';

export default function App() {
  const user = useCurrentUser();

  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      serverUrl="https://updates.yourapp.com"
      deviceId={user?.id}
      customHeaders={{
        // 用户分组（VIP 用户优先体验）
        'x-user-group': user?.isVip ? 'vip' : 'normal',
        // 地区（按地区灰度）
        'x-region': user?.region ?? 'default',
        // AB 测试分组
        'x-ab-group': user?.id ? (parseInt(user.id, 36) % 2 === 0 ? 'A' : 'B') : 'A',
      }}
    >
      <MainScreen />
    </RapidSProvider>
  );
}
```

### 内测用户灰度

```tsx
// App.tsx
import { RapidSProvider } from '@rapid-s/sdk';
import { getBetaTesterStatus } from './utils/betaTest';

export default function App() {
  const isBetaTester = getBetaTesterStatus();

  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      customHeaders={{
        'x-beta-tester': isBetaTester ? 'true' : 'false',
      }}
    >
      <MainScreen />
    </RapidSProvider>
  );
}
```

## 手动控制更新流程

```tsx
// hooks/useManualUpdate.ts
import { useUpdater } from '@rapid-s/sdk';
import { useCallback } from 'react';
import { Alert } from 'react-native';

export function useManualUpdate() {
  const { state, checkForUpdate, downloadUpdate, applyUpdate } = useUpdater();

  // 完整更新流程
  const performUpdate = useCallback(async () => {
    // 1. 检查更新
    const manifest = await checkForUpdate();
    if (!manifest) {
      Alert.alert('提示', '当前已是最新版本');
      return;
    }

    // 2. 确认下载
    const shouldDownload = await new Promise<boolean>((resolve) => {
      Alert.alert(
        '发现新版本',
        `版本 ${manifest.metadata.version} 可用，是否下载？`,
        [
          { text: '稍后', onPress: () => resolve(false) },
          { text: '下载', onPress: () => resolve(true) },
        ],
      );
    });

    if (!shouldDownload) return;

    // 3. 下载更新
    await downloadUpdate();

    // 4. 确认重启
    Alert.alert('更新已就绪', '是否立即重启应用？', [
      { text: '稍后', style: 'cancel' },
      { text: '立即重启', onPress: applyUpdate },
    ]);
  }, [checkForUpdate, downloadUpdate, applyUpdate]);

  return { state, performUpdate };
}
```

## 静默更新

```tsx
// App.tsx
import { useEffect } from 'react';
import { RapidSProvider, useUpdater } from '@rapid-s/sdk';
import { AppState } from 'react-native';

function SilentUpdater({ children }: { children: React.ReactNode }) {
  const { state, checkForUpdate, downloadUpdate, applyUpdate } = useUpdater();

  useEffect(() => {
    // 应用进入后台时检查并下载更新
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'background') {
        const manifest = await checkForUpdate();
        if (manifest) {
          await downloadUpdate();
        }
      }
    });

    return () => subscription.remove();
  }, [checkForUpdate, downloadUpdate]);

  // 应用启动时如果有就绪的更新，自动应用
  useEffect(() => {
    if (state.status === 'ready') {
      // 延迟 2 秒后自动重启
      const timer = setTimeout(() => {
        applyUpdate();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.status, applyUpdate]);

  return <>{children}</>;
}

export default function App() {
  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      checkOnMount={false} // 禁用自动检查，由 SilentUpdater 控制
    >
      <SilentUpdater>
        <MainScreen />
      </SilentUpdater>
    </RapidSProvider>
  );
}
```

## 错误处理

```tsx
// App.tsx
import { RapidSProvider } from '@rapid-s/sdk';
import type { UpdaterError } from '@rapid-s/sdk';
import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';

export default function App() {
  const handleError = (error: UpdaterError) => {
    // 上报到 Sentry
    Sentry.captureException(error.cause, {
      tags: {
        errorCode: error.code,
        component: 'hot-update',
      },
    });

    // 根据错误类型显示不同提示
    switch (error.code) {
      case 'NETWORK_ERROR':
        Alert.alert('网络错误', '请检查网络连接后重试');
        break;
      case 'DOWNLOAD_FAILED':
        Alert.alert('下载失败', '更新包下载失败，请稍后重试');
        break;
      case 'SIGNATURE_INVALID':
        Alert.alert('安全警告', '更新包签名验证失败，已取消更新');
        break;
      default:
        Alert.alert('更新失败', error.message);
    }
  };

  return (
    <RapidSProvider channelKey="ch_your_channel_key" onError={handleError}>
      <MainScreen />
    </RapidSProvider>
  );
}
```
