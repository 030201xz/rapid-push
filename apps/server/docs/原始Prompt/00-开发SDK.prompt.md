我在开发一个 React Native 热更新服务端，现在需要开发 SDK，你现在需要按顺序了解:

- 热更新定义、Expo 热更新规范
- 当前服务端架构
- 当前测试的工作流
- Expo 规范的 自建服务器热更新 SDK
- 之前废弃版本的 SDK

然后设计一个优雅的 SDK 方案，我认可后再实施

---

资料位置:

1. 热更新定义、Expo 热更新规定
   `/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/apps/server/docs/00-React Native热更新原理/01-codepush热更新原理.md`

`/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/apps/server/docs/02-Expo热更新协议规范(原文).md`

2. 当前服务端架构
   `/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/apps/server/src/modules/hot-update/README.md`

3. 当前测试工作流
   `/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/apps/server/src/modules/hot-update/__test__/api/目录结构.md`

4.Expo SDK

> 很简陋
> `/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/packages/demo/expo`

5. 上一次开发的 SDK 已弃用
   `/Volumes/DevDrive/030201xz/Projects/typescript/code-push/rapid-s/packages/demo/sdk`
