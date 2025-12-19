/**
 * useUpdater Hook
 *
 * 提供更新状态和操作方法
 */

import { useRapidSContext } from '../context';
import type { UseUpdaterResult } from '../../types/state';

/**
 * 获取更新状态和操作方法
 *
 * @example
 * ```tsx
 * function UpdateScreen() {
 *   const { state, checkForUpdate, downloadUpdate, applyUpdate } = useUpdater();
 *
 *   if (state.status === 'available') {
 *     return (
 *       <View>
 *         <Text>有新版本: {state.manifest.metadata.version}</Text>
 *         <Button onPress={downloadUpdate}>下载</Button>
 *       </View>
 *     );
 *   }
 *
 *   if (state.status === 'ready') {
 *     return <Button onPress={applyUpdate}>立即更新</Button>;
 *   }
 *
 *   return <Button onPress={checkForUpdate}>检查更新</Button>;
 * }
 * ```
 */
export function useUpdater(): UseUpdaterResult {
  const { state, actions } = useRapidSContext();

  return {
    state,
    ...actions,
  };
}
