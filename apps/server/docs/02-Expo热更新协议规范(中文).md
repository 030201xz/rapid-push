# Expo Updates v1

_版本 1_

## 简介

这是 Expo Updates 协议规范，用于向运行在多平台上的 Expo 应用程序交付更新。

### 一致性

符合规范的服务器和客户端库必须满足所有规范性要求。一致性要求在本文档中通过描述性断言和具有明确定义含义的关键词来描述。

本文档规范部分中的关键词"必须（MUST）"、"不得（MUST NOT）"、"要求（REQUIRED）"、"应当（SHALL）"、"不应当（SHALL NOT）"、"应该（SHOULD）"、"不应该（SHOULD NOT）"、"推荐（RECOMMENDED）"、"可以（MAY）"和"可选（OPTIONAL）"应按照 [IETF RFC 2119](https://tools.ietf.org/html/rfc2119) 中的描述进行解释。这些关键词可能以小写形式出现，但仍保留其含义，除非明确声明为非规范性内容。

本协议的符合规范的实现可以提供额外功能，但在明确禁止的地方或可能导致不符合规范的地方不得提供。在相关情况下，符合规范的客户端应允许并忽略未知字段。

### 概述

符合规范的服务器和客户端库必须遵循 [RFC 7231](https://tools.ietf.org/html/rfc7231) 中描述的 HTTP 规范以及本规范中描述的更精确的指导。

- _更新_ 定义为 [_清单_](#清单主体) 及其引用的资源。
- [_指令_](#指令主体) 定义为服务器发送给客户端的消息，指示客户端执行某个操作。

Expo Updates 是一个用于组装和向客户端交付更新和指令的协议。

本规范的主要受众是 Expo 应用程序服务和希望管理自己的更新服务器以满足内部需求的组织。

## 客户端

> 参见 [参考客户端库](https://github.com/expo/expo/tree/main/packages/expo-updates)。

运行符合规范的 Expo Updates 客户端库的应用程序必须加载保存在客户端库更新数据库中的最新 _更新_，可能需要根据更新清单 [_元数据_](#清单主体) 的内容进行过滤。

以下描述了符合规范的 Expo Updates 客户端库如何从符合规范的服务器检索新更新：

1. 客户端库必须发起一个 [请求](#请求) 以获取最新的更新和指令，约束条件在请求头中指定。
2. 如果收到 [响应](#响应)，客户端库必须处理其内容：
   - 对于包含 _更新_ 的响应，客户端库应继续发起额外请求以下载和存储清单中指定的任何新资源。清单和资源一起被视为一个新的 _更新_。客户端库将编辑其本地状态以反映新更新已添加到本地存储。它还将使用响应 [头](#清单响应头) 中找到的新 `expo-manifest-filters` 和 `expo-server-defined-headers` 更新本地状态。
   - 对于包含 _指令_ 的响应，客户端库将根据指令类型消费指令，并相应地编辑其本地状态。

## 请求

符合规范的客户端库必须发起带有以下头的 GET 请求：

1. `expo-protocol-version: 1`，指定本 Expo Updates 规范的版本 1。
2. `expo-platform`，指定客户端运行的平台类型。
   - iOS 必须是 `expo-platform: ios`。
   - Android 必须是 `expo-platform: android`。
   - 如果不是这些平台之一，服务器应该返回 400 或 404。
3. `expo-runtime-version` 必须是与客户端兼容的运行时版本。运行时版本规定了客户端正在运行的原生代码设置。它应在客户端构建时设置。例如，在 iOS 客户端中，该值可以设置在 plist 文件中。
4. 前一个响应的 [服务器定义头](#响应) 中规定的任何头。

符合规范的客户端库可以根据 [支持的响应结构](#响应) 发送 `accept: application/expo+json`、`accept: application/json` 或 `accept: multipart/mixed` 之一，但应该发送 `accept: application/expo+json, application/json, multipart/mixed`。符合规范的客户端库可以使用 [RFC 7231](https://datatracker.ietf.org/doc/html/rfc7231#section-5.3.1) 中规定的 "q" 参数表达偏好，默认值为 `1`。

配置为执行 [代码签名](#代码签名) 验证的符合规范的客户端库必须发送 `expo-expect-signature` 头，以指示它期望符合规范的服务器在清单响应中包含 `expo-signature` 头。`expo-expect-signature` 是一个 [Expo SFV](https://docs.expo.dev/technical-specs/expo-sfv-0/) 字典，可以包含以下任何键值对：

- `sig` 应该包含布尔值 `true`，表示它要求符合规范的服务器在 `sig` 键中响应签名。
- `keyid` 应该包含客户端将用于验证签名的公钥的 keyId。
- `alg` 应该包含客户端将用于验证签名的算法。

示例：

```text
expo-protocol-version: 1
accept: application/expo+json;q=0.9, application/json;q=0.8, multipart/mixed
expo-platform: *
expo-runtime-version: *
expo-expect-signature: sig, keyid="root", alg="rsa-v1_5-sha256"
```

## 响应

符合规范的服务器必须以至少以下两种响应结构之一返回响应，可以支持其中一种或两种响应结构，当请求不支持的响应结构时，服务器应该以 HTTP `406` 错误状态响应。服务器如果希望对请求的协议版本返回不兼容的响应，也应该以 HTTP `406` 错误状态响应。

- 对于 `content-type: application/json` 或 `content-type: application/expo+json` 的响应，[通用响应头](#通用响应头) 和 [其他响应头](#其他响应头) 必须在响应头中发送，[清单主体](#清单主体) 必须在响应体中发送。这种响应格式不支持多部分响应，因此不支持 _指令_，当要提供的最新响应不是 _更新_ 时，应该以 HTTP `406` 错误状态响应。
- 对于 `content-type: multipart/mixed` 的响应，响应必须按照 [多部分响应](#多部分响应) 部分的规定进行结构化。
- 没有部分的 [多部分响应](#多部分响应) 可以以 HTTP `204` 状态和无内容响应，因此没有 `content-type` 响应头。

更新和头的选择取决于请求头的值。符合规范的服务器必须响应按创建时间排序的最新更新，满足 [请求头](#请求) 施加的所有参数和约束。服务器可以使用请求的任何属性（如其头和源 IP 地址）在所有满足请求约束的多个更新中进行选择。

### 通用响应头

```text
expo-protocol-version: 1
expo-sfv-version: 0
expo-manifest-filters: <expo-sfv>
expo-server-defined-headers: <expo-sfv>
cache-control: *
content-type: *
```

- `expo-protocol-version` 描述本规范中定义的协议版本，必须为 `1`。
- `expo-sfv-version` 必须为 `0`。
- `expo-manifest-filters` 是一个 [Expo SFV](https://docs.expo.dev/technical-specs/expo-sfv-0/) 字典。它用于按 [清单](#清单主体) 中的 `metadata` 属性过滤客户端库存储的更新。如果过滤器中提到了某个字段，元数据中对应的字段必须缺失或相等，更新才会被包含。客户端库必须存储清单过滤器，直到被更新的响应覆盖。
- `expo-server-defined-headers` 是一个 [Expo SFV](https://docs.expo.dev/technical-specs/expo-sfv-0/) 字典。它定义了客户端库必须存储的头，直到被更新的字典覆盖，并且它们必须包含在每个后续的 [更新请求](#请求) 中。
- `cache-control` 必须设置为适当短的时间段。建议使用 `cache-control: private, max-age=0` 以确保返回最新的清单。设置更长的缓存时间可能导致返回过期的更新。
- `content-type` 必须通过 [RFC 7231](https://tools.ietf.org/html/rfc7231#section-3.4.1) 中定义的 _主动协商_ 确定。由于客户端库 [要求](#请求) 在每个清单请求中发送 `accept` 头，这将始终是 `application/expo+json` 或 `application/json`；否则请求将返回 `406` 错误。

### 其他响应头

```text
expo-signature: *
```

- `expo-signature` 应该包含清单的签名，用于 [代码签名](#代码签名) 的验证步骤，如果清单请求包含 `expo-expect-signature` 头。这是一个 [Expo SFV](https://docs.expo.dev/technical-specs/expo-sfv-0/) 字典，可以包含以下任何键值对：
  - `sig` 必须包含清单的签名。此字段的名称与 `expo-expect-signature` 匹配。
  - `keyid` 可以包含服务器用于签署响应的密钥的 keyId。客户端应该使用与此 `keyid` 匹配的证书来验证签名。
  - `alg` 可以包含服务器用于签署响应的算法。客户端应该仅在与 `keyid` 匹配的证书定义的算法匹配时使用此字段。

### 多部分响应

此格式的更新响应由 [RFC 2046](https://tools.ietf.org/html/rfc2046#section-5.1) 定义的 `multipart/mixed` MIME 类型定义。

此响应格式的头是 [通用响应头](#通用响应头)，但有以下例外：

- `content-type` 应该具有 [RFC 2046](https://tools.ietf.org/html/rfc2046#section-5.1) 定义的 `multipart/mixed` 值。

部分顺序不严格。没有部分的多部分响应（零长度体）应被视为无操作（没有可用的更新或指令），但响应的头仍应发送并由客户端处理。

每个部分定义如下：

1. 可选的 `"manifest"` 部分：
   - 必须有部分头 `content-disposition: form-data; name="manifest"`。第一个参数（`form-data`）不需要是 `form-data`，但 `name` 参数必须有 `manifest` 作为值。
   - 必须有部分头 `content-type: application/json` 或 `application/expo+json`。
   - 如果正在使用代码签名，应该有 [其他响应头](#其他响应头) 中定义的部分头 `expo-signature`。
   - [清单主体](#清单主体) 必须在部分体中发送。
2. 可选的 `"extensions"` 部分：
   - 必须有部分头 `content-disposition: form-data; name="extensions"`。第一个参数（`form-data`）不需要是 `form-data`，但 `name` 参数必须有 `extensions` 作为值。
   - 必须有部分头 `content-type: application/json`。
   - [扩展主体](#扩展主体) 必须在部分体中发送。
3. 可选的 `"directive"` 部分：
   - 必须有部分头 `content-disposition: form-data; name="directive"`。第一个参数（`form-data`）不需要是 `form-data`，但 `name` 参数必须有 `directive` 作为值。
   - 必须有部分头 `content-type: application/json` 或 `application/expo+json`。
   - 如果正在使用代码签名，应该有 [其他响应头](#其他响应头) 中定义的部分头 `expo-signature`。
   - [指令主体](#指令主体) 必须在部分体中发送。

### 清单主体

定义为符合以下用 [TypeScript](https://www.typescriptlang.org/) 表达的 `Manifest` 定义以及每个字段的详细描述的 JSON：

```ts
type Manifest = {
  id: string;
  createdAt: string;
  runtimeVersion: string;
  launchAsset: Asset;
  assets: Asset[];
  metadata: { [key: string]: string };
  extra: { [key: string]: any };
};

type Asset = {
  hash?: string;
  key: string;
  contentType: string;
  fileExtension?: string;
  url: string;
};
```

- `id`：ID 必须唯一指定清单，且必须是 UUID。
- `createdAt`：更新创建的日期和时间是必要的，因为客户端库会选择最新的更新（受 `expo-manifest-filters` 头施加的任何约束）。日期时间应根据 [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) 格式化。
- `runtimeVersion`：可以是开发者定义的任何字符串。它规定了运行相关更新所需的原生代码设置。
- `launchAsset`：作为应用程序代码入口点的特殊资源。此资源的 `fileExtension` 字段将被忽略，应该省略。
- `assets`：更新包使用的资源数组，如 JavaScript、图片和字体。在执行更新之前，所有资源（包括 `launchAsset`）都应下载到磁盘，并应向应用程序代码提供资源 `key` 到磁盘位置的映射。
- 每个资源对象的属性：
  - `hash`：文件的 Base64URL 编码 SHA-256 哈希，以保证完整性。Base64URL 编码由 [IETF RFC 4648](https://datatracker.ietf.org/doc/html/rfc4648#section-5) 定义。
  - `key`：用于从更新的应用程序代码引用此资源的键。此键可以由处理应用程序代码的单独构建步骤生成，例如打包器。
  - `contentType`：[RFC 2045](https://tools.ietf.org/html/rfc2045) 定义的文件 MIME 类型。例如，`application/javascript`、`image/jpeg`。
  - `fileExtension`：建议在客户端保存文件时使用的扩展名。某些平台（如 iOS）要求某些文件类型以扩展名保存。扩展名必须以 `.` 为前缀。例如，**.jpeg**。在某些情况下，例如 launchAsset，此字段将被忽略，采用本地确定的扩展名。如果省略该字段且没有本地规定的扩展名，资源将以无扩展名保存。例如，`./filename`，末尾没有 `.`。
    如果文件扩展名非空且缺少 `.` 前缀，符合规范的客户端应该在文件扩展名前添加 `.`。
  - `url`：可以获取文件的位置。
- `metadata`：与更新关联的元数据。它是一个字符串值字典。服务器可以发送任何它希望用于过滤更新的内容。元数据必须通过随附的 `expo-manifest-filters` 头中定义的过滤器。
- `extra`：用于存储可选的"额外"信息，如第三方配置。例如，如果更新托管在 Expo 应用程序服务（EAS）上，可以包含 EAS 项目 ID：

  ```json
  "extra": {
    "eas": {
      "projectId": "00000000-0000-0000-0000-000000000000"
    }
  }
  ```

### 扩展主体

定义为符合以下用 [TypeScript](https://www.typescriptlang.org/) 表达的 `Extensions` 定义以及每个字段的详细描述的 JSON：

```ts
type Extensions = {
  assetRequestHeaders: ExpoAssetHeaderDictionary;
  ...
}

type ExpoAssetHeaderDictionary = {
  [assetKey: string]: {
    [headerName: string]: string,
  };
}
```

- `assetRequestHeaders`：可以包含一个头（键、值）对的字典，用于包含在资源请求中。键和值都必须是字符串。

### 指令主体

定义为符合以下用 [TypeScript](https://www.typescriptlang.org/) 表达的 `Directive` 定义以及每个字段的详细描述的 JSON：

```ts
type Directive = {
  type: string;
  parameters?: { [key: string]: any };
  extra?: { [key: string]: any };
};
```

- `type`：指令的类型。
- `parameters`：可以包含特定于 `type` 的任何额外信息。
- `extra`：用于存储可选的"额外"信息，如第三方信息。例如，如果更新托管在 Expo 应用程序服务（EAS）上，可以包含 EAS 项目 ID。

符合规范的客户端库和服务器可以指定和实现特定于应用程序需求的指令类型。例如，Expo 应用程序服务目前使用一种类型 `rollBackToEmbedded`，它指示 expo-updates 库使用嵌入在宿主应用程序中的更新，而不是任何其他下载的更新。

## 资源请求

符合规范的客户端库必须向清单指定的资源 URL 发起 GET 请求。客户端库应该包含一个接受清单中指定的资源内容类型的头。此外，客户端库应该指定客户端库能够处理的压缩编码。

示例头：

```text
accept: image/jpeg, */*
accept-encoding: br, gzip
```

符合规范的客户端库还必须包含 [`assetRequestHeaders`](#清单扩展) 中为此资源键包含的任何头（键、值）对。

## 资源响应

位于特定 URL 的资源不得更改或删除，因为客户端库可能随时获取任何更新的资源。符合规范的客户端必须验证资源的 base64url 编码 SHA-256 哈希与清单中资源的 `hash` 字段匹配。

### 资源响应头

资源必须使用客户端根据请求的 `accept-encoding` 头支持的压缩格式进行编码。服务器可以提供未压缩的资源。响应必须包含带有资源 MIME 类型的 `content-type` 头。
例如：

```text
content-encoding: br
content-type: application/javascript
```

建议资源以 `cache-control` 头设置为较长持续时间提供，因为位于给定 URL 的资源不得更改。例如：

```text
cache-control: public, max-age=31536000, immutable
```

### 压缩

资源应该能够以 [Gzip](https://www.gnu.org/software/gzip/) 和 [Brotli](https://github.com/google/brotli) 压缩提供。

## 代码签名

Expo Updates 支持对清单和指令主体进行代码签名。对清单进行代码签名也会间接签署资源，因为它们的哈希存在于清单中并由符合规范的客户端验证。符合规范的客户端可以请求使用私钥对清单或指令进行签名，然后必须在使用清单或指令或下载任何相应的清单资源之前，使用相应的代码签名证书验证清单或指令的签名。客户端必须验证签名证书是自签名的受信任根证书，或者是在由受信任根证书签名的证书链中。在任何一种情况下，根证书都必须嵌入在应用程序或设备的操作系统中。
