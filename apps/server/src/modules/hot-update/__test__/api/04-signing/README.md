# 04-signing: 代码签名场景

测试热更新服务的代码签名功能。

## 场景描述

代码签名用于验证更新来源的真实性，防止中间人攻击。
启用签名后，服务端会对 Manifest 进行 RSA-SHA256 签名。

## 工作原理

1. **服务端配置密钥对** - 使用 RSA 2048-bit 生成公钥和私钥
2. **客户端配置公钥** - 将公钥配置到 `app.json` 的 `expo.updates.codeSigningCertificate`
3. **服务端签名** - 发布更新时，使用私钥对 Manifest JSON 进行签名
4. **客户端验证** - 客户端使用公钥验证 `expo-signature` 头中的签名

## 测试步骤

| 步骤 | 文件                     | 说明               |
| ---- | ------------------------ | ------------------ |
| 00   | `00-setup.ts`            | 环境准备           |
| 01   | `01-set-signing-keys.ts` | 生成并设置签名密钥 |
| 02   | `02-disable-signing.ts`  | 禁用签名           |
| 99   | `99-cleanup.ts`          | 清理测试数据       |

## 运行方式

```bash
cd apps/server

# 按步骤运行
bun run src/modules/hot-update/__test__/api/04-signing/00-setup.ts
bun run src/modules/hot-update/__test__/api/04-signing/01-set-signing-keys.ts
bun run src/modules/hot-update/__test__/api/04-signing/02-disable-signing.ts

# 清理
bun run src/modules/hot-update/__test__/api/04-signing/99-cleanup.ts
```

## 一键运行

```bash
cd apps/server
bun run src/modules/hot-update/__test__/api/04-signing/00-setup.ts && \
bun run src/modules/hot-update/__test__/api/04-signing/01-set-signing-keys.ts && \
bun run src/modules/hot-update/__test__/api/04-signing/02-disable-signing.ts
```

## 覆盖的 API

- `hotUpdate.manage.channels.setSigningKeys` - 设置签名密钥
- `hotUpdate.manage.channels.getPublicKey` - 获取公钥
- `hotUpdate.manage.channels.disableSigning` - 禁用签名

## 客户端配置示例

```json
{
  "expo": {
    "updates": {
      "url": "https://your-server.com/manifests",
      "codeSigningCertificate": "./keys/certificate.pem",
      "codeSigningMetadata": {
        "keyid": "main",
        "alg": "rsa-v1_5-sha256"
      }
    }
  }
}
```

## 签名格式

签名使用 Expo 的 SFV (Structured Field Values) 格式：

```
expo-signature: sig=:BASE64_SIGNATURE:
```
