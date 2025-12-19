# CodePush 热更新原理详解

## 1. CodePush 简介

CodePush 是微软开发的 React Native 热更新解决方案，最初作为 App Center 的一部分提供云服务。虽然微软已宣布停止 App Center 服务，但其开源实现仍被广泛使用，并衍生出多个自托管方案。

### 1.1 核心概念

| 概念 | 描述 |
|------|------|
| **Deployment** | 部署通道（如 Staging、Production） |
| **Deployment Key** | 标识部署通道的唯一密钥 |
| **Release** | 一次发布的 Bundle 包 |
| **Label** | 版本标签（如 v1、v2、v3） |
| **Package Hash** | Bundle 内容的 SHA 哈希值 |
| **Rollout** | 灰度发布百分比 |

### 1.2 典型的部署策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      多环境部署策略                               │
└─────────────────────────────────────────────────────────────────┘

    开发完成
        │
        ▼
  ┌──────────────┐
  │   Staging    │ ◀── 内部测试
  │  部署通道     │     先发布到这里
  └──────┬───────┘
         │ 测试通过
         ▼
  ┌──────────────┐
  │  Production  │ ◀── 生产环境
  │  部署通道     │     灰度发布 (10% → 50% → 100%)
  └──────────────┘
```

## 2. CodePush 架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CodePush 架构                                    │
└─────────────────────────────────────────────────────────────────────────┘

  ┌───────────────┐        ┌───────────────────────────────────────────┐
  │    开发者      │        │              CodePush 服务器               │
  └───────┬───────┘        ├───────────────────────────────────────────┤
          │                 │  ┌─────────────────────────────────────┐  │
          │ CLI 工具        │  │           API Server                │  │
          │ (发布更新)       │  │  • 接收/存储 Bundle                  │  │
          │                 │  │  • 版本管理                          │  │
          ▼                 │  │  • 灰度发布控制                       │  │
  ┌───────────────┐        │  │  • 统计数据收集                       │  │
  │  code-push    │        │  └─────────────────────────────────────┘  │
  │  release-react│ ──────▶│                                           │
  └───────────────┘        │  ┌─────────────────────────────────────┐  │
                           │  │         Storage (CDN)               │  │
                           │  │  • Bundle 文件存储                   │  │
                           │  │  • 静态资源存储                       │  │
                           │  └─────────────────────────────────────┘  │
                           └───────────────────────────────────────────┘
                                              │
                                              │ HTTPS
                                              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                          移动端 App                                  │
  ├─────────────────────────────────────────────────────────────────────┤
  │  ┌────────────────────┐    ┌────────────────────────────────────┐  │
  │  │   CodePush SDK     │    │          本地存储                   │  │
  │  │  (Native + JS)     │    │  • 下载的 Bundle                    │  │
  │  │                    │    │  • 更新元数据                        │  │
  │  │  • 检查更新         │    │  • 回滚备份                         │  │
  │  │  • 下载/验证        │◀──▶│                                    │  │
  │  │  • 安装/回滚        │    │  Documents/                        │  │
  │  │  • 状态同步         │    │  └── CodePush/                     │  │
  │  └────────────────────┘    │      ├── currentPackage.json       │  │
  │                            │      ├── v5/                        │  │
  │                            │      │   ├── bundle.jsbundle        │  │
  │                            │      │   └── assets/                │  │
  │                            │      └── v4/ (备份)                  │  │
  │                            └────────────────────────────────────┘  │
  └─────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 服务端组件

```
CodePush Server
├── API Service           # REST API 服务
│   ├── /updateCheck      # 检查更新接口
│   ├── /reportStatus     # 状态上报接口
│   └── /download         # Bundle 下载接口
│
├── Package Manager       # 包管理
│   ├── 版本控制
│   ├── 差分计算 (diff)
│   └── 哈希校验
│
├── Deployment Manager    # 部署管理
│   ├── 多环境管理
│   ├── 灰度发布
│   └── 强制更新控制
│
└── Storage Backend       # 存储后端
    ├── 本地文件系统
    ├── AWS S3
    ├── Azure Blob
    └── 阿里云 OSS
```

#### 2.2.2 客户端组件

```
CodePush SDK (React Native)
├── Native Module
│   ├── iOS (Objective-C/Swift)
│   │   └── CodePush.m / CodePush.swift
│   └── Android (Java/Kotlin)
│       └── CodePush.java / CodePush.kt
│
├── JavaScript Bridge
│   └── codepush.js
│       ├── sync()
│       ├── checkForUpdate()
│       ├── download()
│       └── install()
│
└── 本地存储管理
    ├── Bundle 文件管理
    ├── 更新状态持久化
    └── 回滚机制
```

## 3. 客户端工作原理

### 3.1 集成方式

#### iOS 集成 (AppDelegate.mm)

```objective-c
#import <CodePush/CodePush.h>

- (NSURL *)bundleURL {
#if DEBUG
    return [[RCTBundleURLProvider sharedSettings] 
        jsBundleURLForBundleRoot:@"index"];
#else
    // CodePush 返回最新的 Bundle 路径
    return [CodePush bundleURL];
#endif
}
```

#### Android 集成 (MainApplication.kt)

```kotlin
import com.microsoft.codepush.react.CodePush

class MainApplication : Application(), ReactApplication {
    override val reactNativeHost: ReactNativeHost = 
        object : DefaultReactNativeHost(this) {
            // CodePush 返回最新的 Bundle 路径
            override fun getJSBundleFile(): String = 
                CodePush.getJSBundleFile()
        }
}
```

### 3.2 Bundle 加载决策流程

```
┌─────────────────────────────────────────────────────────────────┐
│                   App 启动时 Bundle 加载决策                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │   检查本地是否有 CodePush 更新    │
            └─────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │   有本地更新      │            │   无本地更新      │
    └────────┬────────┘            └────────┬────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐            ┌─────────────────┐
    │ 检查更新是否      │            │ 加载内置 Bundle   │
    │ 已安装且有效       │            │ (App 自带的)      │
    └────────┬────────┘            └─────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────┐        ┌───────┐
│  有效  │        │ 无效   │
└───┬───┘        └───┬───┘
    │                │
    ▼                ▼
┌─────────────┐  ┌─────────────┐
│ 加载更新后   │  │ 回滚到上一   │
│ 的 Bundle   │  │ 版本或内置   │
└─────────────┘  └─────────────┘
```

### 3.3 更新同步 (sync) 流程

```javascript
// JavaScript 调用示例
import codePush from 'react-native-code-push';

const codePushOptions = {
    checkFrequency: codePush.CheckFrequency.ON_APP_START,
    installMode: codePush.InstallMode.IMMEDIATE,
    mandatoryInstallMode: codePush.InstallMode.IMMEDIATE,
    updateDialog: {
        title: '发现新版本',
        optionalUpdateMessage: '有新版本可用，是否更新？',
        mandatoryUpdateMessage: '必须更新才能继续使用',
        optionalInstallButtonLabel: '立即更新',
        optionalIgnoreButtonLabel: '稍后'
    }
};

// 使用装饰器包裹 App
@codePush(codePushOptions)
class MyApp extends React.Component {
    // ...
}
```

### 3.4 sync() 方法详细流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         codePush.sync() 流程                             │
└─────────────────────────────────────────────────────────────────────────┘

  codePush.sync() 调用
         │
         ▼
  ┌──────────────────┐
  │ 1. 检查更新       │ ──────▶ 向服务器发送请求
  │    checkForUpdate │         携带: deploymentKey, appVersion,
  └────────┬─────────┘         packageHash, clientUniqueId
           │
           ▼
  ┌──────────────────┐    无更新    ┌──────────────────┐
  │ 2. 是否有更新？   │ ───────────▶ │ 返回 UP_TO_DATE   │
  └────────┬─────────┘              └──────────────────┘
           │ 有更新
           ▼
  ┌──────────────────┐
  │ 3. 是否强制更新？  │
  └────────┬─────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌───────┐    ┌───────┐
│ 强制   │    │ 可选   │
└───┬───┘    └───┬───┘
    │            │
    │            ▼
    │    ┌──────────────────┐    用户忽略
    │    │ 4. 显示更新对话框 │ ─────────────▶ 结束
    │    └────────┬─────────┘
    │             │ 用户确认
    └──────┬──────┘
           │
           ▼
  ┌──────────────────┐
  │ 5. 下载更新包     │ ◀────── 显示下载进度
  │    download()    │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 6. 安装更新       │
  │    install()     │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ 7. 根据 installMode │
  │    决定何时生效    │
  └────────┬─────────┘
           │
    ┌──────┴──────────────┬─────────────────┐
    │                     │                 │
    ▼                     ▼                 ▼
┌─────────┐        ┌──────────┐      ┌──────────┐
│IMMEDIATE│        │ON_NEXT_  │      │ON_NEXT_  │
│立即重启  │        │RESTART   │      │RESUME    │
│App生效  │        │下次启动   │      │从后台返回 │
└─────────┘        │时生效     │      │时生效     │
                   └──────────┘      └──────────┘
```

## 4. 服务端 API 协议

### 4.1 更新检查 API

**请求：**
```http
GET /updateCheck?
  deploymentKey=<DEPLOYMENT_KEY>&
  appVersion=1.0.0&
  packageHash=abc123...&
  clientUniqueId=device-uuid-123&
  isCompanion=false&
  label=v5&
  platform=ios
```

**响应（有更新）：**
```json
{
    "updateInfo": {
        "appVersion": "1.0.0",
        "description": "Bug 修复和性能优化",
        "isAvailable": true,
        "isMandatory": false,
        "label": "v6",
        "packageHash": "def456...",
        "packageSize": 1234567,
        "downloadUrl": "https://cdn.example.com/packages/v6.zip",
        "shouldRunBinaryVersion": false,
        "updateAppVersion": false
    }
}
```

**响应（无更新）：**
```json
{
    "updateInfo": {
        "isAvailable": false,
        "shouldRunBinaryVersion": false,
        "updateAppVersion": false
    }
}
```

### 4.2 状态上报 API

**请求：**
```http
POST /reportStatus/deploy

{
    "appVersion": "1.0.0",
    "deploymentKey": "<DEPLOYMENT_KEY>",
    "clientUniqueId": "device-uuid-123",
    "label": "v6",
    "status": "DeploymentSucceeded",
    "previousDeploymentKey": "<DEPLOYMENT_KEY>",
    "previousLabelOrAppVersion": "v5"
}
```

**状态类型：**
```
DeploymentSucceeded  - 部署成功
DeploymentFailed     - 部署失败
```

## 5. 更新包格式

### 5.1 完整包结构

```
codepush-package.zip
├── CodePush/
│   ├── app.bundle                    # JavaScript Bundle
│   └── assets/                       # 静态资源
│       ├── node_modules/
│       │   └── ...
│       └── src/
│           └── images/
│               └── logo.png
└── codepush.json                     # 包元数据 (可选)
```

### 5.2 元数据 (Package Metadata)

```json
{
    "appVersion": "1.0.0",
    "description": "修复登录页面闪退问题",
    "isMandatory": true,
    "label": "v6",
    "packageHash": "abc123def456...",
    "rollout": 100,
    "size": 1234567,
    "uploadTime": 1702000000000
}
```

## 6. 回滚机制

### 6.1 自动回滚

CodePush 内置了自动回滚机制，防止错误更新导致 App 无法使用：

```
┌─────────────────────────────────────────────────────────────────┐
│                      自动回滚机制                                 │
└─────────────────────────────────────────────────────────────────┘

  App 安装更新 v6
         │
         ▼
  ┌──────────────────┐
  │ 启动并加载 v6     │
  └────────┬─────────┘
         │
         ▼
  ┌──────────────────┐
  │ App 是否正常运行？ │
  └────────┬─────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌───────┐    ┌────────┐
│ 正常   │    │ 崩溃    │
└───┬───┘    └────┬───┘
    │             │
    ▼             ▼
┌─────────────┐  ┌─────────────┐
│ 调用         │  │ 下次启动    │
│ notifyApp   │  │ 自动回滚到   │
│ Ready()     │  │ v5 版本      │
└─────────────┘  └─────────────┘
    │
    ▼
┌─────────────┐
│ 标记 v6 为   │
│ 安装成功     │
│ 删除 v5 备份 │
└─────────────┘
```

### 6.2 关键代码

```javascript
// 必须在更新成功后调用，否则会触发回滚
codePush.notifyAppReady();

// 通常在 App 启动后调用
// 如果使用 codePush() HOC，会自动调用
```

## 7. 安装模式 (InstallMode)

| 模式 | 说明 | 使用场景 |
|------|------|---------|
| `IMMEDIATE` | 立即重启 App 生效 | 紧急 Bug 修复 |
| `ON_NEXT_RESTART` | 下次启动时生效 | 普通更新 |
| `ON_NEXT_RESUME` | 从后台返回时生效 | 需要快速生效但不打断用户 |
| `ON_NEXT_SUSPEND` | App 挂起时生效 | 类似 ON_NEXT_RESUME |

```javascript
// IMMEDIATE - 立即生效
codePush.sync({
    installMode: codePush.InstallMode.IMMEDIATE
});

// ON_NEXT_RESUME - 后台返回时生效
// minimumBackgroundDuration: 最少后台时间 (秒)
codePush.sync({
    installMode: codePush.InstallMode.ON_NEXT_RESUME,
    minimumBackgroundDuration: 60 * 5  // 5 分钟
});
```

## 8. 版本兼容性管理

### 8.1 targetBinaryVersion

CodePush 通过 `targetBinaryVersion` 确保 Bundle 与 App 二进制版本兼容：

```bash
# 发布时指定目标 App 版本
code-push release-react MyApp ios \
    --targetBinaryVersion "1.0.0"

# 支持范围匹配
--targetBinaryVersion ">=1.0.0 <2.0.0"
--targetBinaryVersion "~1.0.0"
--targetBinaryVersion "^1.0.0"
```

### 8.2 版本匹配逻辑

```
App 版本: 1.2.3

更新包 A: targetBinaryVersion = "1.2.3"  → 匹配 ✅
更新包 B: targetBinaryVersion = "1.2.x"  → 匹配 ✅
更新包 C: targetBinaryVersion = ">=1.0.0" → 匹配 ✅
更新包 D: targetBinaryVersion = "2.0.0"  → 不匹配 ❌
```

## 9. 自建服务器方案

### 9.1 服务器端需要实现的功能

为了自建热更新服务器，需要实现以下核心功能：

```
┌─────────────────────────────────────────────────────────────────┐
│                    自建服务器核心功能                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. API 服务                                                      │
│     ├── GET  /updateCheck    # 检查更新                          │
│     ├── POST /reportStatus   # 状态上报                          │
│     └── GET  /download/:pkg  # 下载 Bundle                       │
│                                                                   │
│  2. 包管理服务                                                     │
│     ├── 接收上传的 Bundle                                         │
│     ├── 版本号管理                                                │
│     ├── Package Hash 计算                                        │
│     └── 增量更新包生成 (可选)                                      │
│                                                                   │
│  3. 部署管理                                                       │
│     ├── 多 App 管理                                               │
│     ├── 多环境 (Staging/Production)                              │
│     ├── 灰度发布控制                                              │
│     └── 回滚操作                                                  │
│                                                                   │
│  4. 存储服务                                                       │
│     ├── Bundle 文件存储                                           │
│     ├── CDN 加速 (推荐)                                           │
│     └── 元数据数据库                                              │
│                                                                   │
│  5. CLI 工具                                                       │
│     ├── 登录/认证                                                 │
│     ├── 发布更新                                                  │
│     └── 版本管理                                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 客户端配置自定义服务器

#### Android (strings.xml)

```xml
<resources>
    <!-- 配置自定义服务器地址 -->
    <string moduleConfig="true" name="CodePushServerUrl">
        https://your-codepush-server.com
    </string>
    
    <!-- 可选：配置公钥用于签名验证 -->
    <string moduleConfig="true" name="CodePushPublicKey">
        your-public-key-here
    </string>
</resources>
```

#### iOS (Info.plist)

```xml
<key>CodePushServerURL</key>
<string>https://your-codepush-server.com</string>

<key>CodePushDeploymentKey</key>
<string>your-deployment-key</string>
```

### 9.3 开源自托管方案

| 项目 | 描述 | GitHub |
|------|------|--------|
| **code-push-server** | 微软原版服务器 (已归档) | microsoft/code-push-server |
| **Soomgo CodePush** | 自托管方案，无需 API 服务器 | soomgo-mobile/react-native-code-push |
| **Revopush** | CodePush 替代方案 | revopush/react-native-code-push |

## 10. 数据库设计参考

### 10.1 核心表结构

```sql
-- Apps 表
CREATE TABLE apps (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments 表 (部署通道)
CREATE TABLE deployments (
    id UUID PRIMARY KEY,
    app_id UUID REFERENCES apps(id),
    name VARCHAR(50) NOT NULL,  -- 'Staging' | 'Production'
    deployment_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages 表 (发布的更新包)
CREATE TABLE packages (
    id UUID PRIMARY KEY,
    deployment_id UUID REFERENCES deployments(id),
    label VARCHAR(10) NOT NULL,  -- 'v1', 'v2', ...
    description TEXT,
    app_version VARCHAR(50) NOT NULL,  -- 目标 App 版本
    is_mandatory BOOLEAN DEFAULT FALSE,
    is_disabled BOOLEAN DEFAULT FALSE,
    rollout INTEGER DEFAULT 100,  -- 灰度百分比
    package_hash VARCHAR(64) NOT NULL,
    blob_url TEXT NOT NULL,  -- Bundle 下载地址
    size BIGINT NOT NULL,
    manifest_blob_url TEXT,  -- 资源清单
    release_method VARCHAR(50),  -- 'Upload' | 'Promote' | 'Rollback'
    upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(deployment_id, label)
);

-- Metrics 表 (统计数据)
CREATE TABLE deployment_metrics (
    id UUID PRIMARY KEY,
    deployment_id UUID REFERENCES deployments(id),
    label VARCHAR(10) NOT NULL,
    active INTEGER DEFAULT 0,
    downloaded INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    installed INTEGER DEFAULT 0
);
```

## 11. 总结

CodePush 热更新的核心原理：

1. **客户端**
   - 通过修改 `bundleURL` 返回值，让 React Native 加载更新后的 Bundle
   - SDK 负责检查更新、下载、安装和回滚

2. **服务端**
   - 管理多个 App 和部署通道
   - 存储和分发 Bundle 文件
   - 控制灰度发布和版本兼容

3. **协议**
   - `/updateCheck` - 检查是否有可用更新
   - `/reportStatus` - 上报安装状态
   - 通过 `packageHash` 识别版本

4. **安全性**
   - 代码签名验证
   - HTTPS 传输
   - 自动回滚机制

理解了这些原理后，你就可以开始自建热更新服务器了！下一步建议：

1. 实现基础的 API 服务
2. 实现 Bundle 上传和存储
3. 配置客户端连接到自定义服务器
4. 添加认证和管理功能
