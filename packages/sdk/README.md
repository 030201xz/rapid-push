# @rapid-s/sdk

React Native SDK for Rapid-S hot update server. A thin wrapper around `expo-updates` with full TypeScript support.

## Features

- 🔄 **Thin Wrapper** - Leverages `expo-updates` for reliable native implementation
- 📦 **Type Safe** - Full TypeScript support with types reused from server
- ⚛️ **React Hooks** - Modern React API with `useUpdater` and `useUpdateInfo`
- 📊 **Analytics** - Built-in event tracking and reporting
- 🎯 **Gradual Rollout** - Support for percentage-based and device-specific rollouts

## Installation

```bash
# Using npm
npm install @rapid-s/sdk expo-updates @react-native-async-storage/async-storage

# Using yarn
yarn add @rapid-s/sdk expo-updates @react-native-async-storage/async-storage

# Using bun
bun add @rapid-s/sdk expo-updates @react-native-async-storage/async-storage
```

## Requirements

- Expo SDK 52+
- expo-updates 0.26+
- React 18+
- React Native 0.74+

## Quick Start

### 1. Configure expo-updates

In your `app.json`:

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

### 2. Add Provider

In your root layout (e.g., `app/_layout.tsx`):

```tsx
import { RapidSProvider } from '@rapid-s/sdk';

export default function RootLayout() {
  return (
    <RapidSProvider
      channelKey="ch_your_channel_key"
      serverUrl="https://your-server.com"
      checkOnMount={true}
      checkInterval={60000} // Check every minute
      onUpdateAvailable={(manifest) => {
        console.log('New update available:', manifest.id);
      }}
      onError={(error) => {
        console.error('Update error:', error.message);
      }}
    >
      <App />
    </RapidSProvider>
  );
}
```

### 3. Use Hooks

```tsx
import { useUpdater, useUpdateInfo } from '@rapid-s/sdk';

function UpdateScreen() {
  const { state, checkForUpdate, downloadUpdate, applyUpdate, dismissUpdate } = useUpdater();
  const { runtimeVersion, isEmbedded, updateId } = useUpdateInfo();

  return (
    <View>
      <Text>Version: {runtimeVersion}</Text>
      <Text>Update: {isEmbedded ? 'Embedded' : updateId?.slice(0, 8)}</Text>

      {state.status === 'idle' && (
        <Button onPress={checkForUpdate}>Check for Updates</Button>
      )}

      {state.status === 'checking' && (
        <ActivityIndicator />
      )}

      {state.status === 'available' && (
        <View>
          <Text>New version: {state.manifest.metadata.version}</Text>
          <Button onPress={downloadUpdate}>Download</Button>
          <Button onPress={() => dismissUpdate(true)}>Skip</Button>
        </View>
      )}

      {state.status === 'downloading' && (
        <ProgressBar value={state.progress} />
      )}

      {state.status === 'ready' && (
        <Button onPress={applyUpdate}>Restart to Update</Button>
      )}

      {state.status === 'error' && (
        <Text>Error: {state.error.message}</Text>
      )}
    </View>
  );
}
```

## State Machine

The `useUpdater` hook returns a discriminated union state:

```typescript
type UpdaterState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; manifest: Manifest }
  | { status: 'downloading'; progress: number; manifest: Manifest }
  | { status: 'ready'; manifest: Manifest }
  | { status: 'applying'; manifest: Manifest }
  | { status: 'rollback'; directive: Directive }
  | { status: 'error'; error: UpdaterError };
```

## Provider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelKey` | `string` | Required | Channel key from server |
| `serverUrl` | `string` | Optional | Server URL (reads from app.json if not provided) |
| `checkOnMount` | `boolean` | `true` | Check for updates on mount |
| `checkInterval` | `number` | `0` | Auto-check interval in ms (0 = disabled) |
| `enableAnalytics` | `boolean` | `true` | Enable event tracking |
| `deviceId` | `string` | Auto-generated | Device ID for rollout rules |
| `customHeaders` | `Record<string, string>` | Optional | Custom headers for rollout rules |
| `onUpdateAvailable` | `(manifest) => void` | Optional | Callback when update is available |
| `onUpdateDownloaded` | `(manifest) => void` | Optional | Callback when download completes |
| `onRollback` | `(directive) => void` | Optional | Callback when rollback directive received |
| `onError` | `(error) => void` | Optional | Callback on error |

## Core API (without React)

For non-React usage or testing:

```typescript
import { Updater, checkForUpdate, downloadUpdate, applyUpdate } from '@rapid-s/sdk';

// Check for updates
const manifest = await Updater.checkForUpdate();
if (manifest) {
  console.log('Update available:', manifest.id);
  
  // Download
  await Updater.downloadUpdate();
  
  // Apply (restarts app)
  await Updater.applyUpdate();
}
```

## Analytics

Events are automatically tracked and reported to the server:

- `update_check` - When checking for updates
- `download_start` - When download begins
- `download_complete` - When download finishes
- `download_failed` - When download fails
- `apply_success` - When update is applied
- `apply_failed` - When apply fails
- `rollback` - When rollback occurs

## License

MIT
