/**
 * 热更新测试页面
 *
 * 用于测试 RapidS SDK 功能
 */

import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUpdateInfo, useUpdater } from '@rapid-s/sdk';

// ==================== 版本信息区块 ====================

function VersionInfoSection() {
  const info = useUpdateInfo();

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle">当前版本信息</ThemedText>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>运行时版本:</ThemedText>
        <ThemedText style={styles.value}>{info.runtimeVersion ?? '未知'}</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>更新 ID:</ThemedText>
        <ThemedText style={styles.value}>
          {info.isEmbedded ? '内置版本' : info.updateId?.slice(0, 12) ?? '未知'}
        </ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>渠道:</ThemedText>
        <ThemedText style={styles.value}>{info.channelKey?.slice(0, 16) ?? '未知'}...</ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>上次检查:</ThemedText>
        <ThemedText style={styles.value}>
          {info.lastCheckTime?.toLocaleTimeString() ?? '从未'}
        </ThemedText>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.label}>待应用更新:</ThemedText>
        <ThemedText style={styles.value}>{info.hasPendingUpdate ? '是' : '否'}</ThemedText>
      </View>
    </ThemedView>
  );
}

// ==================== 更新状态区块 ====================

function UpdateStatusSection() {
  const { state, checkForUpdate, downloadUpdate, applyUpdate, dismissUpdate, clearError } =
    useUpdater();

  // 根据状态渲染不同内容
  const renderStatus = () => {
    switch (state.status) {
      case 'idle':
        return <ThemedText style={styles.statusIdle}>✓ 当前为最新版本</ThemedText>;

      case 'checking':
        return <ThemedText style={styles.statusChecking}>⏳ 正在检查更新...</ThemedText>;

      case 'available':
        return (
          <View>
            <ThemedText style={styles.statusAvailable}>🎉 发现新版本!</ThemedText>
            <ThemedText style={styles.manifestInfo}>ID: {state.manifest.id.slice(0, 12)}...</ThemedText>
          </View>
        );

      case 'downloading':
        return (
          <View>
            <ThemedText style={styles.statusDownloading}>⬇️ 正在下载...</ThemedText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${state.progress * 100}%` }]} />
            </View>
            <ThemedText style={styles.progressText}>
              {Math.round(state.progress * 100)}%
            </ThemedText>
          </View>
        );

      case 'ready':
        return (
          <View>
            <ThemedText style={styles.statusReady}>✅ 更新已就绪</ThemedText>
            <ThemedText style={styles.manifestInfo}>重启后生效</ThemedText>
          </View>
        );

      case 'applying':
        return <ThemedText style={styles.statusApplying}>🔄 正在应用更新...</ThemedText>;

      case 'rollback':
        return (
          <View>
            <ThemedText style={styles.statusRollback}>⚠️ 需要回滚</ThemedText>
            <ThemedText style={styles.manifestInfo}>
              参数: {JSON.stringify(state.directive.parameters)}
            </ThemedText>
          </View>
        );

      case 'error':
        return (
          <View>
            <ThemedText style={styles.statusError}>❌ 发生错误</ThemedText>
            <ThemedText style={styles.errorCode}>{state.error.code}</ThemedText>
            <ThemedText style={styles.errorMessage}>{state.error.message}</ThemedText>
          </View>
        );
    }
  };

  // 根据状态渲染可用操作
  const renderActions = () => {
    switch (state.status) {
      case 'idle':
        return (
          <TouchableOpacity style={styles.button} onPress={() => checkForUpdate()}>
            <ThemedText style={styles.buttonText}>检查更新</ThemedText>
          </TouchableOpacity>
        );

      case 'available':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={() => downloadUpdate()}>
              <ThemedText style={styles.buttonText}>下载更新</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => dismissUpdate(false)}
            >
              <ThemedText style={styles.secondaryButtonText}>稍后再说</ThemedText>
            </TouchableOpacity>
          </View>
        );

      case 'ready':
        return (
          <TouchableOpacity
            style={[styles.button, styles.applyButton]}
            onPress={() => {
              Alert.alert('确认更新', '应用将重启以完成更新', [
                { text: '取消', style: 'cancel' },
                { text: '确认', onPress: () => applyUpdate() },
              ]);
            }}
          >
            <ThemedText style={styles.buttonText}>立即应用</ThemedText>
          </TouchableOpacity>
        );

      case 'error':
        return (
          <TouchableOpacity style={styles.button} onPress={() => clearError()}>
            <ThemedText style={styles.buttonText}>清除错误</ThemedText>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle">更新状态</ThemedText>
      <View style={styles.statusContainer}>{renderStatus()}</View>
      <View style={styles.actionsContainer}>{renderActions()}</View>
    </ThemedView>
  );
}

// ==================== 主页面 ====================

export default function UpdatesScreen() {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">热更新测试</ThemedText>
        <ThemedText style={styles.subtitle}>RapidS SDK Demo</ThemedText>
      </ThemedView>

      <VersionInfoSection />
      <UpdateStatusSection />

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">测试说明</ThemedText>
        <ThemedText style={styles.helpText}>1. 点击「检查更新」查询服务器</ThemedText>
        <ThemedText style={styles.helpText}>2. 如有更新，点击「下载更新」</ThemedText>
        <ThemedText style={styles.helpText}>3. 下载完成后，点击「立即应用」</ThemedText>
        <ThemedText style={styles.helpText}>4. 应用将重启并加载新版本</ThemedText>
      </ThemedView>

      {/* 版本标记 - 修改此处以测试热更新 */}
      <ThemedView style={styles.versionBadge}>
        <ThemedText style={styles.versionText}>v1.0.0 (Build 1)</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

// ==================== 样式 ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  subtitle: {
    opacity: 0.6,
    marginTop: 4,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    opacity: 0.6,
  },
  value: {
    fontWeight: '500',
  },
  statusContainer: {
    padding: 16,
    alignItems: 'center',
  },
  statusIdle: {
    fontSize: 16,
    color: '#4CAF50',
  },
  statusChecking: {
    fontSize: 16,
    color: '#2196F3',
  },
  statusAvailable: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
  },
  statusDownloading: {
    fontSize: 16,
    color: '#2196F3',
    textAlign: 'center',
  },
  statusReady: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  statusApplying: {
    fontSize: 16,
    color: '#9C27B0',
  },
  statusRollback: {
    fontSize: 16,
    color: '#FF5722',
    textAlign: 'center',
  },
  statusError: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
  },
  manifestInfo: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  errorCode: {
    marginTop: 8,
    fontFamily: 'monospace',
    color: '#F44336',
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: 4,
    opacity: 0.7,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsContainer: {
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: '#4CAF50',
  },
  helpText: {
    opacity: 0.7,
    lineHeight: 22,
  },
  versionBadge: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    opacity: 0.5,
  },
  versionText: {
    fontSize: 12,
  },
});
