# Crypto 加密模块

提供 RSA 签名和密钥管理功能，符合 Expo Updates 协议。

## 功能

- **RSA-SHA256 签名**：使用 Node.js crypto 模块
- **SFV 格式**：符合 Structured Field Values 规范
- **密钥对生成**：RSA 2048-bit，PEM 格式

## 目录结构

```
crypto/
├── signature.ts  # RSA 签名实现
└── index.ts      # 模块入口
```

## 使用方式

### 生成密钥对

```typescript
import { generateKeyPair } from '@/common/crypto';

const { publicKey, privateKey } = generateKeyPair();
// publicKey: PEM 格式 SPKI 公钥
// privateKey: PEM 格式 PKCS8 私钥
```

### 签名数据

```typescript
import { signData, verifySignature } from '@/common/crypto';

// 签名
const signature = signData('data to sign', privateKey);

// 验证
const isValid = verifySignature('data to sign', signature, publicKey);
```

### Expo Manifest 签名

```typescript
import {
  signManifest,
  verifyManifestSignature,
} from '@/common/crypto';

// 签名 Manifest（返回 SFV 格式）
const manifestJson = JSON.stringify(manifest);
const expoSignature = signManifest(manifestJson, privateKey);
// 返回: sig=:base64signature:

// 验证签名
const isValid = verifyManifestSignature(
  manifestJson,
  expoSignature,
  publicKey
);
```

## SFV 格式说明

Expo Updates 协议使用 Structured Field Values (SFV) 格式：

```
sig=:base64EncodedSignature:
```

- `sig=` 是签名键
- `:...:` 是 SFV 的 Byte Sequence 格式
- 中间是 Base64 编码的签名值

## 类型定义

```typescript
interface KeyPair {
  publicKey: string; // PEM 格式公钥
  privateKey: string; // PEM 格式私钥
}
```

## 安全注意事项

- 私钥应加密存储在数据库中
- 密钥传输应使用安全通道
- 建议定期轮换密钥对
