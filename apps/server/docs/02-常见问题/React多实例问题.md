```

› Logs for your project will appear below. Press Ctrl+C to exit.
Android Bundled 1314ms node_modules/.bun/expo-router@6.0.21+d7e1ae3f410b79e1/node_modules/expo-router/entry.js (2006 modules)
 ERROR  Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.

Code: index.mjs
  570 |   };
  571 | }
> 572 | function useUpdateInfo() {
      | ^
  573 |   const { config, state } = useRapidSContext();
  574 |   const [lastCheckTime, setLastCheckTime2] = useState(null);
  575 |   useEffect(() => {
Call Stack
  useUpdateInfo (packages/sdk/dist/index.mjs:572)
  VersionInfoSection (apps/app/app/(tabs)/updates.tsx:16:29)

Code: updates.tsx
  191 |       </ThemedView>
  192 |
> 193 |       <VersionInfoSection />
      |       ^
  194 |       <UpdateStatusSection />
  195 |
  196 |       <ThemedView style={styles.section}>
Call Stack
  UpdatesScreen (apps/app/app/(tabs)/updates.tsx:193:7)
  TabLayout (apps/app/app/(tabs)/_layout.tsx:13:5)
  RootLayout (apps/app/app/_layout.tsx:24:7)
 ERROR  Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.

Code: index.mjs
  570 |   };
  571 | }
> 572 | function useUpdateInfo() {
      | ^
  573 |   const { config, state } = useRapidSContext();
  574 |   const [lastCheckTime, setLastCheckTime2] = useState(null);
  575 |   useEffect(() => {
Call Stack
  useUpdateInfo (packages/sdk/dist/index.mjs:572)
  VersionInfoSection (apps/app/app/(tabs)/updates.tsx:16:29)

Code: updates.tsx
  191 |       </ThemedView>
  192 |
> 193 |       <VersionInfoSection />
      |       ^
  194 |       <UpdateStatusSection />
  195 |
  196 |       <ThemedView style={styles.section}>
Call Stack
  UpdatesScreen (apps/app/app/(tabs)/updates.tsx:193:7)
  TabLayout (apps/app/app/(tabs)/_layout.tsx:13:5)
  RootLayout (apps/app/app/_layout.tsx:24:7)
 ERROR  [TypeError: Cannot read property 'useMemoCache' of null]

Code: index.mjs
  570 |   };
  571 | }
> 572 | function useUpdateInfo() {
      | ^
  573 |   const { config, state } = useRapidSContext();
  574 |   const [lastCheckTime, setLastCheckTime2] = useState(null);
  575 |   useEffect(() => {
Call Stack
  useUpdateInfo (packages/sdk/dist/index.mjs:572)
  VersionInfoSection (apps/app/app/(tabs)/updates.tsx:16:29)

Code: updates.tsx
  191 |       </ThemedView>
  192 |
> 193 |       <VersionInfoSection />
      |       ^
  194 |       <UpdateStatusSection />
  195 |
  196 |       <ThemedView style={styles.section}>
Call Stack
  UpdatesScreen (apps/app/app/(tabs)/updates.tsx:193:7)
  TabLayout (apps/app/app/(tabs)/_layout.tsx:13:5)
  RootLayout (apps/app/app/_layout.tsx:24:7)
```

因为问题找到了！SDK 的 devDependencies 中使用了 react: ^19.2.3，而 App 使用的是 react: 19.1.0。
核心问题: SDK 在构建时，tsup 将 React 代码编译时可能引入了 React Compiler 的转换（useMemoCache），但 SDK 在运行时使用的是 App 的 React 版本，而 App 的 React 19.1.0 版本不支持 useMemoCache。

---

```
➜  rapid-s git:(main) ✗ ls -la /Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/packages/sdk/node_modules/react 2>/dev/null || echo "No react in SDK node_modules"
lrwxr-xr-x@ 1 x  staff  58 Dec 19 21:19 /Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/packages/sdk/node_modules/react -> ../../../node_modules/.bun/react@19.2.3/node_modules/react
➜  rapid-s git:(main) ✗
```

---

优雅解决方案设计

将 SDK 包的 react 版本与 app 版本保持一致，删除工作区 node_modules、全部重新安装、重新构建 SDK 包，问题解决。
