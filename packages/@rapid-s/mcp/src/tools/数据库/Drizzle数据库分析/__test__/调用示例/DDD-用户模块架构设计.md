# 🏗️ DDD 用户模块完整架构设计

> 基于Rapid Server用户数据库设计的领域驱动设计实现方案

---

## 📋 一、有界上下文识别与分析

### 🏷️ **1. 用户身份上下文 (User Identity Context)**
**核心流程**: 注册 → 验证 → 登录 → 会话管理

**聚合根** 🔒:
- **User 聚合** (用户身份聚合)
  - 根实体: User (id, username, email, phone, status)
  - 值对象: UserCredentials, UserContact, UserProfile
  - 策略对象: UserStatus (pending_verification, active, disabled, locked)

**不变性**: 
- username 全局唯一
- 一个User对应一个UserCredentials
- status转换受限(pending_verification → active, active ⇄ disabled/locked)

**实体关系**:
```
User (聚合根)
├── UserCredentials (值对象) - 密码哈希、邮箱验证状态、手机验证状态
├── UserProfile (值对象) - 昵称、头像、个人简介、性别、出生日期
└── UserContact (值对象) - 邮箱、手机号、最后登录信息
```

---

### 🏷️ **2. 认证授权上下文 (Authentication & Authorization Context)**
**核心流程**: 登录 → Token生成 → Token轮换 → 设备管理 → 权限校验

**聚合根** 🔒:
- **Session 聚合** (会话聚合)
  - 根实体: Session (sessionId, userId, deviceId, expiresAt)
  - 值对象: SessionDevice (deviceType, osName, browser)
  - 策略: 会话撤销、设备信任、活跃时间追踪

- **RefreshTokenFamily 聚合** (Token家族聚合) ⭐ **重点**
  - 根实体: RefreshTokenFamily (family, userId, sessionId)
  - 值对象: RefreshToken (tokenHash, generation, parentTokenId, status)
  - 机制: Token轮换、重放检测、家族撤销
  - 关键概念:
    - `generation`: 第N代Token (轮换次数)
    - `family`: 同一会话的所有RT共享family ID
    - `parentTokenId`: 形成RT链条，用于重放检测

- **Permission 聚合** (权限聚合)
  - 根实体: Permission (id, code, type, resource)
  - 层级结构: 权限树 (parentId支持权限分组)

- **Role 聚合** (角色聚合)
  - 根实体: Role (id, code, level, isSystem)
  - 权限集合: 多个Permission通过关联表
  - RBAC模式: 角色→权限→资源访问

**不变性**:
- 每个RT只能使用一次
- 检测到重放攻击时撤销整个family
- Session和RefreshTokenFamily绑定关系不可变

**事件** 📡:
- UserLoggedIn (userId, sessionId, deviceId, ipAddress)
- RefreshTokenRotated (sessionId, oldGeneration, newGeneration, family)
- SessionRevoked (sessionId, revokeReason)
- ReplayAttackDetected (family, userId)

---

### 🏷️ **3. 用户账户管理上下文 (Account Management Context)**
**核心流程**: 设置管理 → 隐私控制 → 偏好配置

**聚合根** 🔒:
- **UserAccount 聚合** (账户管理聚合)
  - 根实体: UserAccount (userId)
  - 值对象集合:
    - InterfaceSetting (theme, language, timezone, dateFormat)
    - NotificationSetting (各渠道开关, 免打扰时段)
    - PrivacySetting (可见性, 第三方共享权限)
    - Preferences (用户偏好JSONB)

**不变性**:
- 每个用户只有一条账户设置记录
- 隐私设置影响其他上下文的可见性

**事件** 📡:
- UserSettingsChanged (userId, settingType, oldValue, newValue)
- NotificationPreferenceUpdated (userId, channels)

---

### 🏷️ **4. 社交关系上下文 (Social Relationship Context)**
**核心流程**: 邀请体系 → 用户标签 → 关系维护

**聚合根** 🔒:
- **UserTree 聚合** (用户树形结构聚合) ⭐ **重点**
  - 根实体: UserTree (userId)
  - 闭包表: UserRelationship (userId, ancestorId, depth, directReferrerId)
  - 概念: 无限层级推荐体系
  - 查询优化:
    - depth=0: 自己
    - depth=1: 直接邀请人
    - depth=N: N级上级
    - 按depth快速定位层级

- **UserTagging 聚合** (用户标签聚合)
  - 根实体: Tag (id, code, category)
  - 关联: UserTagMapping (userId, tagId, source, assignedBy)
  - 来源: system(系统自动) vs manual(手动分配)

**不变性**:
- 用户与其祖先的关系不可逆
- depth值递增

**事件** 📡:
- UserInvited (userId, directReferrerId, invitedAt)
- UserTagged (userId, tagId, taggedBy, reason)

---

### 🏷️ **5. 支付地址上下文 (Payment & Address Context)**
**核心流程**: 地址管理 → 支付方式 → 验证

**聚合根** 🔒:
- **UserAddress 聚合**
  - 根实体: Address (id, userId, isDefault)
  - 值对象: AddressInfo (省市区街道, 邮编)

- **PaymentMethod 聚合**
  - 根实体: PaymentMethod (id, userId, isDefault, isVerified)
  - 敏感数据: encryptedAccountData (需加密)
  - 支付类型: bank_card, alipay, wechat等

**不变性**:
- 每用户最多一个默认地址
- 敏感信息加密存储
- 支付方式需验证才能使用

---

### 🏷️ **6. 审计与系统上下文 (Audit & System Context)**
**核心流程**: 操作日志 → 通知管理 → 黑白名单

**聚合根** 🔒:
- **AuditLog 聚合** (审计日志聚合)
  - 根实体: ActivityLog (id, userId, action, level, result)
  - 记录: IP, UserAgent, 详细JSON数据

- **UserNotification 聚合** (通知聚合)
  - 根实体: Notification (id, userId, type, priority, isRead)

- **SecurityPolicy 聚合** (安全策略聚合)
  - 根实体: Blacklist/Whitelist (userId, type, effectiveFrom/To)

**事件** 📡:
- OperationAudited (userId, action, result, timestamp)
- NotificationSent (userId, notificationType, channels)

---

## 🏗️ 二、目录结构设计 (16层分布式架构)

### 📁 **第一层：接口层 (Presentation Layer)**
```
apps/backend/rapid-server/src
│
└── interfaces/
    └── user/                                    # 🏷️ User Identity Context
        ├── api/                                 # REST API
        │   ├── controllers/
        │   │   ├── user.controller.ts
        │   │   └── auth.controller.ts
        │   ├── dto/
        │   │   ├── request/
        │   │   │   ├── register.request.dto.ts
        │   │   │   └── login.request.dto.ts
        │   │   └── response/
        │   │       ├── user.response.dto.ts
        │   │       └── auth.response.dto.ts
        │   └── middleware/
        │       ├── auth.middleware.ts
        │       └── validation.middleware.ts
        │
        ├── graphql/                             # GraphQL Schema
        │   ├── resolvers/
        │   │   ├── user.resolver.ts
        │   │   └── auth.resolver.ts
        │   └── schema/
        │       └── user.schema.graphql
        │
        └── websocket/                           # WebSocket事件
            ├── handlers/
            │   └── user-events.handler.ts
            └── emitters/
                └── user.emitter.ts

```

### 📁 **第二层：应用层 (Application Layer)**
```
src/
└── applications/
    │
    ├── identity/                                # 🏷️ User Identity Context
    │   ├── commands/
    │   │   ├── register-user.command.ts
    │   │   ├── update-profile.command.ts
    │   │   └── change-status.command.ts
    │   ├── queries/
    │   │   ├── get-user.query.ts
    │   │   ├── get-user-profile.query.ts
    │   │   └── check-username-exists.query.ts
    │   ├── events/
    │   │   ├── user-registered.event.ts
    │   │   ├── user-status-changed.event.ts
    │   │   └── user-profile-updated.event.ts
    │   ├── handlers/
    │   │   ├── register-user.handler.ts
    │   │   └── get-user.handler.ts
    │   └── dto/
    │       ├── input/
    │       │   └── register-user.input.ts
    │       └── output/
    │           └── user.output.ts
    │
    ├── authentication/                          # 🏷️ Auth Context
    │   ├── commands/
    │   │   ├── login.command.ts
    │   │   ├── logout.command.ts
    │   │   ├── refresh-token.command.ts
    │   │   └── revoke-session.command.ts
    │   ├── queries/
    │   │   ├── get-session.query.ts
    │   │   └── get-refresh-token-status.query.ts
    │   ├── events/
    │   │   ├── user-logged-in.event.ts
    │   │   ├── token-rotated.event.ts
    │   │   ├── replay-attack-detected.event.ts
    │   │   └── session-revoked.event.ts
    │   ├── handlers/
    │   │   ├── login.handler.ts
    │   │   ├── refresh-token.handler.ts
    │   │   └── detect-replay-attack.handler.ts
    │   └── dto/
    │       ├── input/
    │       │   ├── login.input.ts
    │       │   └── refresh-token.input.ts
    │       └── output/
    │           ├── login-response.output.ts
    │           └── tokens.output.ts
    │
    ├── account-settings/                        # 🏷️ Account Management Context
    │   ├── commands/
    │   │   ├── update-interface-settings.command.ts
    │   │   ├── update-notification-settings.command.ts
    │   │   └── update-privacy-settings.command.ts
    │   ├── queries/
    │   │   ├── get-settings.query.ts
    │   │   └── get-notifications-config.query.ts
    │   ├── events/
    │   │   └── settings-updated.event.ts
    │   ├── handlers/
    │   │   └── update-settings.handler.ts
    │   └── dto/
    │       ├── input/
    │       │   └── update-settings.input.ts
    │       └── output/
    │           └── settings.output.ts
    │
    ├── social-relationships/                    # 🏷️ Social Context
    │   ├── commands/
    │   │   ├── invite-user.command.ts
    │   │   ├── tag-user.command.ts
    │   │   └── update-tag.command.ts
    │   ├── queries/
    │   │   ├── get-referral-tree.query.ts
    │   │   ├── get-referral-level.query.ts
    │   │   └── get-user-tags.query.ts
    │   ├── events/
    │   │   ├── user-invited.event.ts
    │   │   └── user-tagged.event.ts
    │   ├── handlers/
    │   │   ├── invite-user.handler.ts
    │   │   └── tag-user.handler.ts
    │   └── dto/
    │       ├── input/
    │       │   └── invite-user.input.ts
    │       └── output/
    │           ├── referral-tree.output.ts
    │           └── user-tags.output.ts
    │
    ├── payment-address/                         # 🏷️ Payment & Address Context
    │   ├── commands/
    │   │   ├── add-address.command.ts
    │   │   ├── add-payment-method.command.ts
    │   │   └── set-default.command.ts
    │   ├── queries/
    │   │   ├── get-addresses.query.ts
    │   │   └── get-payment-methods.query.ts
    │   ├── events/
    │   │   ├── address-added.event.ts
    │   │   └── payment-method-added.event.ts
    │   ├── handlers/
    │   │   └── add-address.handler.ts
    │   └── dto/
    │       ├── input/
    │       │   └── add-address.input.ts
    │       └── output/
    │           └── address.output.ts
    │
    └── audit/                                   # 🏷️ Audit & System Context
        ├── commands/
        │   └── log-activity.command.ts
        ├── queries/
        │   └── get-activity-logs.query.ts
        ├── events/
        │   └── activity-logged.event.ts
        ├── handlers/
        │   └── log-activity.handler.ts
        └── dto/
            ├── input/
            │   └── log-activity.input.ts
            └── output/
                └── activity-log.output.ts
```

### 📁 **第三层：领域层 (Domain Layer)**
```
src/
└── domains/
    │
    ├── identity/                                # 🔒 User Aggregate Root
    │   ├── aggregates/
    │   │   └── user/
    │   │       ├── user.aggregate.ts            # 聚合根
    │   │       ├── user-credentials.vo.ts       # 值对象
    │   │       ├── user-profile.vo.ts           # 值对象
    │   │       ├── user-contact.vo.ts           # 值对象
    │   │       ├── user-status.enum.ts          # 策略值对象
    │   │       └── user.exception.ts
    │   │
    │   ├── repositories/
    │   │   ├── user.repository.ts               # 仓储接口 (应用层调用)
    │   │   └── user-repository.factory.ts
    │   │
    │   ├── domain-events/
    │   │   ├── user-registered.domain-event.ts
    │   │   ├── user-profile-updated.domain-event.ts
    │   │   └── user-status-changed.domain-event.ts
    │   │
    │   ├── services/
    │   │   ├── user-creation.domain-service.ts   # 领域服务
    │   │   └── user-profile.domain-service.ts
    │   │
    │   └── specifications/
    │       ├── active-user.specification.ts
    │       └── verified-user.specification.ts
    │
    ├── authentication/                          # 🔒 Session & RefreshTokenFamily
    │   ├── aggregates/
    │   │   ├── session/
    │   │   │   ├── session.aggregate.ts          # 聚合根
    │   │   │   ├── session-device.vo.ts
    │   │   │   └── session.exception.ts
    │   │   │
    │   │   └── refresh-token-family/
    │   │       ├── refresh-token-family.aggregate.ts  # 🌟 Token轮换核心
    │   │       ├── refresh-token.entity.ts           # 实体
    │   │       ├── refresh-token.vo.ts               # 值对象
    │   │       ├── token-generation.vo.ts
    │   │       └── refresh-token-family.exception.ts
    │   │
    │   ├── repositories/
    │   │   ├── session.repository.ts
    │   │   └── refresh-token-family.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── user-logged-in.domain-event.ts
    │   │   ├── refresh-token-rotated.domain-event.ts
    │   │   ├── replay-attack-detected.domain-event.ts
    │   │   └── session-revoked.domain-event.ts
    │   │
    │   ├── services/
    │   │   ├── token-rotation.domain-service.ts   # Token轮换业务逻辑
    │   │   ├── replay-detection.domain-service.ts # 重放检测
    │   │   └── session-management.domain-service.ts
    │   │
    │   ├── specifications/
    │   │   ├── valid-refresh-token.specification.ts
    │   │   └── valid-session.specification.ts
    │   │
    │   └── constants/
    │       ├── token-expiry.constant.ts
    │       └── token-config.constant.ts
    │
    ├── authorization/                           # 🔒 Permission & Role
    │   ├── aggregates/
    │   │   ├── permission/
    │   │   │   ├── permission.aggregate.ts
    │   │   │   ├── permission-tree.vo.ts
    │   │   │   └── permission-type.enum.ts
    │   │   │
    │   │   └── role/
    │   │       ├── role.aggregate.ts
    │   │       ├── role-level.vo.ts
    │   │       └── role.exception.ts
    │   │
    │   ├── repositories/
    │   │   ├── permission.repository.ts
    │   │   └── role.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── permission-created.domain-event.ts
    │   │   └── role-assigned.domain-event.ts
    │   │
    │   ├── services/
    │   │   ├── permission-evaluation.domain-service.ts
    │   │   └── role-hierarchy.domain-service.ts
    │   │
    │   └── specifications/
    │       ├── user-has-permission.specification.ts
    │       └── role-can-assign.specification.ts
    │
    ├── account-settings/                        # 🔒 UserAccount Aggregate
    │   ├── aggregates/
    │   │   └── user-account/
    │   │       ├── user-account.aggregate.ts     # 聚合根
    │   │       ├── interface-setting.vo.ts
    │   │       ├── notification-setting.vo.ts
    │   │       ├── privacy-setting.vo.ts
    │   │       └── user-preferences.vo.ts
    │   │
    │   ├── repositories/
    │   │   └── user-account.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── settings-updated.domain-event.ts
    │   │   └── notification-preference-changed.domain-event.ts
    │   │
    │   └── services/
    │       └── settings-management.domain-service.ts
    │
    ├── social-relationships/                    # 🔒 UserTree & UserTagging
    │   ├── aggregates/
    │   │   ├── user-tree/
    │   │   │   ├── user-tree.aggregate.ts        # 聚合根 (闭包表)
    │   │   │   ├── referral-relationship.entity.ts
    │   │   │   ├── referral-path.vo.ts
    │   │   │   └── referral-depth.vo.ts
    │   │   │
    │   │   └── user-tagging/
    │   │       ├── user-tagging.aggregate.ts
    │   │       ├── tag-assignment.entity.ts
    │   │       └── tag-source.enum.ts
    │   │
    │   ├── repositories/
    │   │   ├── user-tree.repository.ts
    │   │   └── user-tagging.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── user-invited.domain-event.ts
    │   │   └── user-tagged.domain-event.ts
    │   │
    │   ├── services/
    │   │   ├── referral-tree.domain-service.ts
    │   │   ├── referral-level-calculator.domain-service.ts
    │   │   └── tagging.domain-service.ts
    │   │
    │   └── specifications/
    │       ├── valid-referral-relationship.specification.ts
    │       └── user-can-tag.specification.ts
    │
    ├── payment-address/                         # 🔒 UserAddress & PaymentMethod
    │   ├── aggregates/
    │   │   ├── user-address/
    │   │   │   ├── user-address.aggregate.ts
    │   │   │   ├── address-info.vo.ts
    │   │   │   └── address-label.enum.ts
    │   │   │
    │   │   └── payment-method/
    │   │       ├── payment-method.aggregate.ts
    │   │       ├── encrypted-account.vo.ts
    │   │       ├── payment-provider.enum.ts
    │   │       └── payment-method.exception.ts
    │   │
    │   ├── repositories/
    │   │   ├── user-address.repository.ts
    │   │   └── payment-method.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── address-added.domain-event.ts
    │   │   └── payment-method-verified.domain-event.ts
    │   │
    │   └── services/
    │       └── payment-encryption.domain-service.ts
    │
    ├── audit-system/                            # 🔒 AuditLog & Others
    │   ├── aggregates/
    │   │   ├── activity-log/
    │   │   │   ├── activity-log.aggregate.ts
    │   │   │   ├── activity-action.enum.ts
    │   │   │   └── activity-context.vo.ts
    │   │   │
    │   │   └── security-policy/
    │   │       ├── blacklist.aggregate.ts
    │   │       ├── whitelist.aggregate.ts
    │   │       └── policy-type.enum.ts
    │   │
    │   ├── repositories/
    │   │   ├── activity-log.repository.ts
    │   │   └── security-policy.repository.ts
    │   │
    │   ├── domain-events/
    │   │   ├── activity-logged.domain-event.ts
    │   │   └── security-policy-changed.domain-event.ts
    │   │
    │   └── services/
    │       └── audit-trail.domain-service.ts
    │
    └── shared/
        ├── value-objects/
        │   ├── user-id.vo.ts
        │   ├── email.vo.ts
        │   ├── phone.vo.ts
        │   ├── username.vo.ts
        │   └── ip-address.vo.ts
        │
        ├── domain-events/
        │   └── domain-event.base.ts
        │
        ├── specifications/
        │   └── specification.base.ts
        │
        └── exceptions/
            ├── domain.exception.ts
            ├── business.exception.ts
            └── technical.exception.ts

```

### 📁 **第四层：防腐层 (Anti-Corruption Layer - ACL)** 🛡️
```
src/
└── acl/                                         # 🛡️ 跨上下文通信隔离
    │
    ├── identity-auth-adapter/
    │   ├── identity-auth.mapper.ts              # 数据转换
    │   └── identity-auth-facade.ts              # 外观模式
    │
    ├── auth-audit-adapter/
    │   ├── auth-audit.mapper.ts
    │   └── auth-audit-facade.ts
    │
    ├── social-payment-adapter/
    │   ├── social-payment.mapper.ts
    │   └── social-payment-facade.ts
    │
    └── shared-adapters/
        ├── event-bus-adapter.ts
        └── repository-adapter.ts
```

### 📁 **第五层：基础设施层 (Infrastructure Layer)**
```
src/
└── infrastructure/
    │
    ├── database/
    │   ├── schema/
    │   │   └── user/                            # Drizzle ORM schemas
    │   │       ├── 01-core/
    │   │       ├── 02-auth/
    │   │       ├── 03-settings/
    │   │       ├── 04-social/
    │   │       ├── 05-activity/
    │   │       ├── 06-address-payment/
    │   │       └── 07-system/
    │   │
    │   ├── repositories/                        # 具体仓储实现
    │   │   ├── user.repository.impl.ts
    │   │   ├── session.repository.impl.ts
    │   │   ├── refresh-token-family.repository.impl.ts
    │   │   ├── permission.repository.impl.ts
    │   │   ├── role.repository.impl.ts
    │   │   ├── user-account.repository.impl.ts
    │   │   ├── user-tree.repository.impl.ts
    │   │   ├── user-address.repository.impl.ts
    │   │   ├── payment-method.repository.impl.ts
    │   │   └── activity-log.repository.impl.ts
    │   │
    │   ├── migrations/
    │   │   └── drizzle-migrations/
    │   │
    │   └── db.ts                                # 数据库连接配置
    │
    ├── cache/
    │   ├── redis/
    │   │   ├── user-cache.service.ts
    │   │   ├── session-cache.service.ts
    │   │   └── permission-cache.service.ts
    │   │
    │   └── cache-strategies/
    │       ├── user-cache.strategy.ts
    │       └── token-cache.strategy.ts
    │
    ├── messaging/                               # 📡  事件驱动
    │   ├── event-publisher/
    │   │   └── domain-event-publisher.ts
    │   │
    │   ├── event-subscribers/
    │   │   ├── user-registered.subscriber.ts
    │   │   ├── replay-attack-detected.subscriber.ts
    │   │   └── user-tagged.subscriber.ts
    │   │
    │   └── event-config/
    │       └── event-subscription.config.ts
    │
    ├── security/
    │   ├── encryption/
    │   │   ├── password.encryptor.ts
    │   │   ├── token.encryptor.ts
    │   │   └── data.encryptor.ts               # 支付信息加密
    │   │
    │   ├── jwt/
    │   │   ├── jwt.service.ts
    │   │   └── jwt-config.ts
    │   │
    │   ├── validators/
    │   │   ├── email.validator.ts
    │   │   └── phone.validator.ts
    │   │
    │   └── hashing/
    │       └── bcrypt.hasher.ts
    │
    ├── http-clients/
    │   ├── sms-gateway.client.ts               # 短信服务
    │   ├── email-gateway.client.ts             # 邮件服务
    │   └── social-oauth.client.ts              # OAuth服务
    │
    └── logger/
        ├── structured-logger.ts
        └── audit-logger.ts
```

### 📁 **第六层：共享内核 (Shared Kernel)**
```
src/
└── shared-kernel/
    │
    ├── types/
    │   ├── pagination.type.ts
    │   ├── response.type.ts
    │   └── query-filter.type.ts
    │
    ├── utils/
    │   ├── id-generator.util.ts
    │   ├── date-helper.util.ts
    │   └── string-formatter.util.ts
    │
    ├── enums/
    │   ├── result-status.enum.ts
    │   ├── http-status.enum.ts
    │   └── error-code.enum.ts
    │
    └── constants/
        ├── regex.constant.ts
        └── timeout.constant.ts
```

### 📁 **第七层：测试与文档**
```
__test__/
├── unit/
│   ├── domains/
│   │   ├── identity.spec.ts
│   │   ├── authentication.spec.ts
│   │   └── social-relationships.spec.ts
│   │
│   └── applications/
│       ├── register-user.spec.ts
│       ├── login.spec.ts
│       └── refresh-token.spec.ts
│
├── integration/
│   ├── user-workflows.spec.ts
│   ├── token-rotation.spec.ts
│   └── replay-attack-detection.spec.ts
│
└── e2e/
    ├── auth-flow.e2e.spec.ts
    └── social-invite.e2e.spec.ts

docs/
├── DDD-architecture.md
├── bounded-contexts.md
├── aggregate-design.md
├── event-driven-design.md
├── token-rotation-mechanism.md
├── referral-tree-design.md
└── api-examples.md
```

---

## 🔄 三、上下文映射 (Context Mapping)

```
                    🏷️ User Identity
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
    🏷️ Auth ←──────→ 🏷️ Account       🏷️ Social
       ↓                Settings           ↓
    Sessions            ↓            Referral Tree
    RefreshToken   Notifications     Tags
       ↓                ↓                ↓
    🛡️ ACL         🛡️ ACL         🛡️ ACL
       ↓                ↓                ↓
  ┌───┴────────────────┴────────────────┴───┐
  │                                         │
  ↓ 📡 Domain Events (Event Bus)           ↓
  
  PaymentAddress ←──→ AuditSystem
  PaymentMethod ←──→ Notifications

```

### **关键映射关系** 🔗:
1. **User Identity → Authentication** (Shared Kernel): User → Session的所有权
2. **Authentication → Account Settings** (Customer-Supplier): Token验证 → 应用设置
3. **Social → Audit** (Event-driven): 用户行为 → 审计日志
4. **Payment → Audit** (Conformist): 支付操作记录 → 审计系统

---

## 📡 四、事件驱动设计

### **领域事件流** 📊:

```
① 用户注册流程
UserRegisteredEvent
  ├─→ 创建UserAccount (Account Settings)
  ├─→ 发送验证邮件
  └─→ 审计日志记录

② 用户登录流程
UserLoggedInEvent
  ├─→ 创建Session
  ├─→ 生成RefreshTokenFamily
  ├─→ 清空失效Session缓存
  └─→ 审计日志 + 位置记录

③ Token轮换流程
RefreshTokenRotatedEvent
  ├─→ 新Token入库
  ├─→ 旧Token标记已使用
  ├─→ 更新Session活跃时间
  └─→ 缓存更新

④ 重放攻击检测
ReplayAttackDetectedEvent
  ├─→ 立即撤销整个Family
  ├─→ 撤销关联Session
  ├─→ 发送安全警报
  └─→ 记录审计日志 (CRITICAL)

⑤ 邀请关系建立
UserInvitedEvent
  ├─→ 构建UserTree (闭包表)
  ├─→ 更新referral metrics
  └─→ 更新推荐统计

⑥ 用户标签更新
UserTaggedEvent
  ├─→ 更新用户画像
  ├─→ 可见性权限控制
  └─→ 审计记录
```

---

## 🔐 五、关键设计模式

### **1. Token轮换机制** (RT Rotation)
```
RT Version 1 (generation=1)
  ↓ 使用
  ├─ 验证token有效性
  ├─ 标记 is_used=true
  ├─ 生成新RT (generation=2)
  ├─ 记录 parent_token_id
  └─ 返回新RT
  
检测重放攻击:
  ├─ 如果RT已被使用 → 撤销整个family
  └─ 如果RT已被撤销 → 撤销session + family
```

### **2. 闭包表设计** (Referral Tree)
```
用户A邀请B,B邀请C,C邀请D

UserRelationship表:
┌─────────────────────────────────┐
│ userId│ancestorId│depth│referrer│
├─────────────────────────────────┤
│  D    │    D     │  0  │ null  │ ← 自己
│  D    │    C     │  1  │ C     │ ← 直接邀请人
│  D    │    B     │  2  │ C     │ ← 二级
│  D    │    A     │  3  │ C     │ ← 三级
└─────────────────────────────────┘

快速查询:
- depth=1 WHERE userId=D: 直接邀请人
- depth<=N WHERE userId=D: N级以内的推荐链
- ancestorId=A: A邀请的所有人
```

### **3. RBAC权限树**
```
Permission Tree:
┌─────────────────────────────┐
│ 用户管理 (parentId=null)    │
├─────────────────────────────┤
│ ├─ 创建用户                 │
│ ├─ 编辑用户                 │
│ ├─ 删除用户                 │
│ └─ 权限管理 (parentId=用户管理)
│     ├─ 分配角色             │
│     └─ 撤销权限             │
└─────────────────────────────┘

按权限树级别控制权限继承
```

---

## ✅ 六、不变性约束总结

| 聚合根 | 核心不变性 |
|-------|----------|
| **User** | username唯一, status转换受限 |
| **Session** | 一个会话对应一次登录 |
| **RefreshTokenFamily** | RT只使用一次,检测重放→撤销family |
| **Permission** | code全局唯一,支持树形继承 |
| **Role** | code全局唯一,级别递增 |
| **UserAccount** | 每用户一条设置记录 |
| **UserTree** | depth递增,关系不可逆 |
| **UserAddress** | 每用户最多一个默认地址 |
| **PaymentMethod** | 敏感数据加密,验证后可用 |

---

## 🎯 七、实施建议

### **分阶段实施** 📅:

```
Phase 1: 核心身份与认证
- User Aggregate
- Session Aggregate  
- RefreshTokenFamily Aggregate (重点)
- 基础仓储实现

Phase 2: 权限授权
- Permission Aggregate
- Role Aggregate
- RBAC实现

Phase 3: 账户与社交
- UserAccount Aggregate
- UserTree Aggregate (闭包表)
- UserTagging Aggregate

Phase 4: 支付与审计
- Payment/Address Aggregates
- AuditLog Aggregate
- Event Publisher

Phase 5: 集成与优化
- ACL防腐层
- 缓存策略
- 性能优化
```

### **技术栈** 🛠️:
- **ORM**: Drizzle ORM (Type-safe)
- **事件总线**: Bull Queue / Kafka
- **缓存**: Redis
- **加密**: bcrypt / TweetNaCl.js
- **JWT**: jsonwebtoken
- **验证**: Zod + Valibot
- **日志**: Winston + Pino

