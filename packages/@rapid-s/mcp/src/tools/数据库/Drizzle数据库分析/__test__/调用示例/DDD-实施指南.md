# 🔨 DDD 用户模块实施指南

## 一、快速参考表

### 📊 有界上下文快速识别

| 上下文 | 聚合根 | 核心责任 | 关键表 | 事件 |
|-------|-------|--------|-------|-----|
| **User Identity** 🏷️ | User | 用户身份管理 | users | UserRegistered, StatusChanged |
| **Authentication** 🏷️ | Session, RefreshTokenFamily | 登录会话 & Token轮换 | sessions, user_refresh_tokens | UserLoggedIn, TokenRotated, ReplayDetected |
| **Authorization** 🏷️ | Permission, Role | 权限与角色 | permissions, user_roles | PermissionCreated, RoleAssigned |
| **Account Settings** 🏷️ | UserAccount | 个人设置管理 | user_*_settings, user_preferences | SettingsChanged |
| **Social** 🏷️ | UserTree, UserTagging | 推荐体系 & 标签 | user_relationships, user_tags | UserInvited, UserTagged |
| **Payment & Address** 🏷️ | UserAddress, PaymentMethod | 支付地址 | user_addresses, user_payment_methods | AddressAdded, PaymentVerified |
| **Audit & System** 🏷️ | AuditLog, SecurityPolicy | 审计日志 & 安全 | user_activity_logs, user_blacklists | ActivityLogged |

---

## 二、聚合根设计详解

### 🔒 1. User 聚合 (Identity Context)

```typescript
// domains/identity/aggregates/user/user.aggregate.ts

export class User extends AggregateRoot {
  private id: UserId;
  private username: Username;
  private credentials: UserCredentials;
  private profile: UserProfile;
  private contact: UserContact;
  private status: UserStatus;
  private metadata: UserMetadata;

  // 只读属性，通过getter暴露
  getId(): UserId { return this.id; }
  getUsername(): string { return this.username.value; }
  getStatus(): UserStatus { return this.status; }
  getCredentials(): UserCredentials { return this.credentials; }

  // 工厂方法：创建新用户 (领域逻辑)
  static register(
    username: string,
    email: string,
    password: string,
  ): User {
    // 1. 验证用户名格式
    const usernameVO = Username.create(username);
    
    // 2. 验证邮箱格式
    const emailVO = Email.create(email);
    
    // 3. 创建凭证
    const credentials = UserCredentials.create({
      passwordHash: PasswordHasher.hash(password),
      emailVerified: false,
      phoneVerified: false,
    });

    const user = new User(
      UserId.generate(),
      usernameVO,
      credentials,
      UserProfile.empty(),
      UserContact.withEmail(emailVO),
      UserStatus.PENDING_VERIFICATION,
      UserMetadata.default(),
    );

    // 4. 发布领域事件
    user.addDomainEvent(
      new UserRegisteredEvent(
        user.id,
        user.username.value,
        user.contact.email.value,
      ),
    );

    return user;
  }

  // 命令方法：更新个人资料
  updateProfile(
    nickname: string,
    avatarUrl: string,
    bio: string,
  ): void {
    const newProfile = UserProfile.create({
      nickname,
      avatarUrl,
      bio,
    });

    const oldProfile = this.profile;
    this.profile = newProfile;

    this.addDomainEvent(
      new UserProfileUpdatedEvent(
        this.id,
        oldProfile,
        newProfile,
      ),
    );
  }

  // 命令方法：改变状态 (受限的状态机)
  changeStatus(newStatus: UserStatus, reason?: string): void {
    // 状态转换规则
    if (!this.canTransitionTo(newStatus)) {
      throw new UserStatusTransitionException(
        this.status,
        newStatus,
      );
    }

    const oldStatus = this.status;
    this.status = newStatus;

    this.addDomainEvent(
      new UserStatusChangedEvent(
        this.id,
        oldStatus,
        newStatus,
        reason,
      ),
    );
  }

  // 查询方法：检查是否已验证
  isVerified(): boolean {
    return this.credentials.isEmailVerified() &&
           this.credentials.isPhoneVerified();
  }

  // 查询方法：检查是否活跃
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE &&
           !this.isDeleted;
  }

  private canTransitionTo(newStatus: UserStatus): boolean {
    const allowedTransitions = {
      [UserStatus.PENDING_VERIFICATION]: [
        UserStatus.ACTIVE,
        UserStatus.DELETED,
      ],
      [UserStatus.ACTIVE]: [
        UserStatus.DISABLED,
        UserStatus.LOCKED,
        UserStatus.DELETED,
      ],
      [UserStatus.DISABLED]: [
        UserStatus.ACTIVE,
        UserStatus.DELETED,
      ],
      [UserStatus.LOCKED]: [
        UserStatus.DISABLED,
        UserStatus.DELETED,
      ],
    };

    return (allowedTransitions[this.status] || []).includes(
      newStatus,
    );
  }
}

// 值对象
export class UserCredentials extends ValueObject {
  readonly passwordHash: string;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;

  static create(props: {
    passwordHash: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  }): UserCredentials {
    return new UserCredentials(
      props.passwordHash,
      props.emailVerified,
      props.phoneVerified,
    );
  }

  isPasswordValid(plainPassword: string): boolean {
    return PasswordHasher.compare(plainPassword, this.passwordHash);
  }
}

// 值对象：用户名 (支持Email和Phone登录)
export class Username extends ValueObject {
  readonly value: string;

  static create(value: string): Username {
    if (!this.isValid(value)) {
      throw new InvalidUsernameException(value);
    }
    return new Username(value);
  }

  private static isValid(value: string): boolean {
    // 用户名：3-50字符，只含字母数字下划线
    return /^[a-zA-Z0-9_]{3,50}$/.test(value);
  }
}
```

**不变性约束**:
- ✅ username全局唯一 (由仓储保证)
- ✅ status转换遵循有限状态机
- ✅ 创建时必须验证所有值对象
- ✅ 敏感信息(密码)不可读取,只能比对

---

### 🔒 2. RefreshTokenFamily 聚合 (Authentication Context) ⭐ **重点**

```typescript
// domains/authentication/aggregates/refresh-token-family/refresh-token-family.aggregate.ts

export class RefreshTokenFamily extends AggregateRoot {
  private id: RefreshTokenFamilyId;
  private sessionId: string;
  private userId: UserId;
  private family: string; // 家族标识
  private tokens: RefreshToken[]; // 这一代及历代tokens
  private isRevoked: boolean;
  private revokeReason?: string;
  private createdAt: Date;

  static createNewFamily(
    sessionId: string,
    userId: UserId,
    tokenHash: string,
  ): RefreshTokenFamily {
    const family = crypto.randomUUID();

    const initialToken = RefreshToken.create({
      tokenHash,
      family,
      generation: 1,
      parentTokenId: null,
      isUsed: false,
      isRevoked: false,
    });

    const familyAggregate = new RefreshTokenFamily(
      RefreshTokenFamilyId.generate(),
      sessionId,
      userId,
      family,
      [initialToken],
      false,
      null,
      new Date(),
    );

    familyAggregate.addDomainEvent(
      new RefreshTokenFamilyCreatedEvent(
        familyAggregate.id,
        family,
        userId,
      ),
    );

    return familyAggregate;
  }

  /**
   * 核心命令：Token轮换
   * 
   * 流程:
   * 1. 查找指定generation的token
   * 2. 验证token有效性 (未使用、未撤销、未过期)
   * 3. 标记当前token已使用
   * 4. 生成新token (generation + 1)
   * 5. 发布事件
   */
  rotateToken(
    currentTokenHash: string,
    newTokenHash: string,
  ): RotationResult {
    // 1. 查找当前token
    const currentToken = this.tokens.find(t => t.tokenHash === currentTokenHash);
    if (!currentToken) {
      throw new TokenNotFoundException();
    }

    // 2. 验证token状态
    this.validateTokenForRotation(currentToken);

    // 3. 标记当前token为已使用
    currentToken.markAsUsed(new Date());

    // 4. 生成新token (generation + 1)
    const newGeneration = currentToken.generation + 1;
    const newToken = RefreshToken.create({
      tokenHash: newTokenHash,
      family: this.family,
      generation: newGeneration,
      parentTokenId: currentToken.id,
      isUsed: false,
      isRevoked: false,
    });

    this.tokens.push(newToken);

    // 5. 发布事件
    this.addDomainEvent(
      new RefreshTokenRotatedEvent(
        this.id,
        this.family,
        currentToken.generation,
        newGeneration,
        this.userId,
      ),
    );

    return {
      newToken,
      generation: newGeneration,
    };
  }

  /**
   * 检测重放攻击
   * 
   * 如果一个已使用或已撤销的token被再次使用:
   * - 立即撤销整个family
   * - 撤销关联session
   * - 发送安全警报
   */
  detectAndHandleReplayAttack(
    attemptedTokenHash: string,
    ipAddress: string,
  ): void {
    const token = this.tokens.find(t => t.tokenHash === attemptedTokenHash);
    
    if (!token) {
      return; // token不存在,可能伪造,由其他层处理
    }

    // 如果token已使用或已撤销
    if (token.isUsed || token.isRevoked) {
      // 撤销整个family
      this.revokeFamily('replay_detected', `Replay attack detected: ${ipAddress}`);

      this.addDomainEvent(
        new ReplayAttackDetectedEvent(
          this.id,
          this.family,
          this.userId,
          token.generation,
          ipAddress,
        ),
      );
    }
  }

  /**
   * 撤销整个Token家族
   * 这会影响:
   * 1. 当前family的所有token标记为revoked
   * 2. 关联的session需要单独撤销
   * 3. 用户需要重新登录
   */
  revokeFamily(reason: string, revokeReason?: string): void {
    if (this.isRevoked) {
      return; // 已撤销
    }

    this.isRevoked = true;
    this.revokeReason = reason;

    // 标记所有token为已撤销
    for (const token of this.tokens) {
      token.revoke(reason);
    }

    this.addDomainEvent(
      new RefreshTokenFamilyRevokedEvent(
        this.id,
        this.family,
        this.userId,
        reason,
      ),
    );
  }

  /**
   * 查询: 验证token有效性
   */
  isTokenValid(tokenHash: string, now: Date = new Date()): boolean {
    if (this.isRevoked) return false;

    const token = this.tokens.find(t => t.tokenHash === tokenHash);
    if (!token) return false;

    return token.isValid(now);
  }

  /**
   * 查询: 获取最新代的token
   */
  getLatestToken(): RefreshToken | null {
    return this.tokens.reduce((latest, current) =>
      current.generation > (latest?.generation ?? 0) ? current : latest,
      null as RefreshToken | null,
    );
  }

  private validateTokenForRotation(token: RefreshToken): void {
    if (token.isUsed) {
      throw new TokenAlreadyUsedException();
    }

    if (token.isRevoked) {
      throw new TokenRevokedException();
    }

    if (token.isExpired()) {
      throw new TokenExpiredException();
    }

    // 该token必须是最新生成的 (防止跳过某一代)
    const latestToken = this.getLatestToken();
    if (latestToken && token.generation < latestToken.generation) {
      throw new OldGenerationTokenException();
    }
  }
}

// 实体：单个RefreshToken
export class RefreshToken extends Entity {
  readonly tokenHash: string;
  readonly family: string;
  readonly generation: number;
  readonly parentTokenId?: string;
  private isUsed: boolean;
  private usedAt?: Date;
  private isRevoked: boolean;
  private revokedAt?: Date;
  private revokeReason?: string;
  readonly expiresAt: Date;

  static create(props: {
    tokenHash: string;
    family: string;
    generation: number;
    parentTokenId: string | null;
    isUsed: boolean;
    isRevoked: boolean;
  }): RefreshToken {
    return new RefreshToken(
      EntityId.generate(),
      props.tokenHash,
      props.family,
      props.generation,
      props.parentTokenId,
      props.isUsed,
      undefined,
      props.isRevoked,
      undefined,
      undefined,
      this.calculateExpiry(),
    );
  }

  markAsUsed(now: Date): void {
    if (this.isUsed) {
      throw new TokenAlreadyUsedException();
    }
    this.isUsed = true;
    this.usedAt = now;
  }

  revoke(reason: string): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokeReason = reason;
  }

  isValid(now: Date = new Date()): boolean {
    return !this.isUsed &&
           !this.isRevoked &&
           now < this.expiresAt;
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  private static calculateExpiry(): Date {
    const expiryDays = 7; // RT有效期7天
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);
    return expiry;
  }
}
```

**关键设计**:
- ✅ Token家族: 同一会话的所有RT共享family ID
- ✅ Generation: 每次轮换递增,形成链条
- ✅ 重放检测: 已使用的token再次使用 → 撤销整个family
- ✅ 链条追踪: parentTokenId记录上一代token

---

### 🔒 3. UserTree 聚合 (Social Context) - 闭包表设计

```typescript
// domains/social-relationships/aggregates/user-tree/user-tree.aggregate.ts

/**
 * 使用闭包表(Closure Table)实现无限层级邀请关系
 * 
 * 优势:
 * 1. 常数时间查询任意层级
 * 2. 支持无限深度
 * 3. 灵活的聚合操作
 * 
 * 表结构:
 * user_relationships(id, user_id, ancestor_id, depth, direct_referrer_id, invited_at)
 * 
 * 查询示例:
 * - 获取直接邀请人: SELECT * WHERE user_id=X AND depth=1
 * - 获取所有上级: SELECT * WHERE user_id=X AND depth>0 ORDER BY depth DESC
 * - 获取邀请链: SELECT * WHERE user_id=X ORDER BY depth
 */
export class UserTree extends AggregateRoot {
  private userId: UserId;
  private relationships: ReferralRelationship[]; // 所有祖先关系(depth=0到N)

  static createRoot(userId: UserId): UserTree {
    // 创建根节点 (depth=0, 自己)
    const selfRelation = ReferralRelationship.createSelf(userId);

    const tree = new UserTree(
      UserTreeId.generate(),
      userId,
      [selfRelation],
    );

    tree.addDomainEvent(
      new UserTreeCreatedEvent(userId),
    );

    return tree;
  }

  /**
   * 邀请关系建立
   * 
   * 流程:
   * 1. 验证直接邀请人存在
   * 2. 创建depth=1的直接关系
   * 3. 从直接邀请人的所有祖先继承(depth+1)
   */
  addInvitation(directReferrerId: UserId, now: Date): void {
    // 1. 创建直接邀请关系 (depth=1)
    const directRelation = ReferralRelationship.create({
      userId: this.userId,
      ancestorId: directReferrerId,
      depth: 1,
      directReferrerId,
      invitedAt: now,
    });

    this.relationships.push(directRelation);

    // 2. 从直接邀请人的所有上级继承 (depth+1)
    // 注意: 这个操作需要查询directReferrer的所有ancestors
    // 由于此处是聚合,实际实现在应用层通过领域服务完成
    //
    // 伪代码:
    // referrerTree = userTreeRepository.findByUserId(directReferrerId)
    // for each referrerRelation in referrerTree.getAncestors():
    //   inheritedRelation = ReferralRelationship.create({
    //     userId: this.userId,
    //     ancestorId: referrerRelation.ancestorId,
    //     depth: referrerRelation.depth + 1,
    //     directReferrerId: directReferrerId,
    //     invitedAt: now,
    //   })
    //   this.relationships.push(inheritedRelation)

    this.addDomainEvent(
      new UserInvitedEvent(
        this.userId,
        directReferrerId,
        now,
      ),
    );
  }

  /**
   * 查询: 获取直接邀请人
   */
  getDirectReferrer(): ReferralRelationship | null {
    return this.relationships.find(r => r.depth === 1) || null;
  }

  /**
   * 查询: 获取指定层级的祖先
   */
  getAncestorAtLevel(level: number): ReferralRelationship | null {
    return this.relationships.find(r => r.depth === level) || null;
  }

  /**
   * 查询: 获取所有上级 (按层级排序)
   */
  getAncestors(maxDepth?: number): ReferralRelationship[] {
    return this.relationships
      .filter(r => r.depth > 0 && (maxDepth === undefined || r.depth <= maxDepth))
      .sort((a, b) => a.depth - b.depth);
  }

  /**
   * 查询: 获取推荐链长度
   */
  getReferralChainLength(): number {
    return Math.max(...this.relationships.map(r => r.depth), 0);
  }

  /**
   * 查询: 计算N级推荐数
   */
  countReferralsAtLevel(level: number): number {
    // 这需要在应用层通过仓储实现
    // 查询: SELECT COUNT(*) FROM user_relationships WHERE ancestor_id=this.userId AND depth=level
    return 0;
  }
}

// 实体：推荐关系
export class ReferralRelationship extends Entity {
  readonly userId: UserId;
  readonly ancestorId: UserId;
  readonly depth: number; // 0=自己, 1=直接邀请人, 2=二级, etc.
  readonly directReferrerId: UserId | null;
  readonly invitedAt: Date;

  static createSelf(userId: UserId): ReferralRelationship {
    return new ReferralRelationship(
      EntityId.generate(),
      userId,
      userId,
      0,
      null,
      new Date(),
    );
  }

  static create(props: {
    userId: UserId;
    ancestorId: UserId;
    depth: number;
    directReferrerId: UserId;
    invitedAt: Date;
  }): ReferralRelationship {
    if (props.depth <= 0) {
      throw new InvalidReferralDepthException();
    }

    return new ReferralRelationship(
      EntityId.generate(),
      props.userId,
      props.ancestorId,
      props.depth,
      props.directReferrerId,
      props.invitedAt,
    );
  }

  isDirectReferrer(): boolean {
    return this.depth === 1;
  }
}

// 值对象: 推荐路径信息
export class ReferralPath extends ValueObject {
  readonly chainLength: number;
  readonly directReferrerId: UserId;
  readonly referralBonus?: number; // 推荐奖励

  static create(
    chainLength: number,
    directReferrerId: UserId,
  ): ReferralPath {
    if (chainLength < 1) {
      throw new InvalidChainLengthException();
    }

    return new ReferralPath(
      chainLength,
      directReferrerId,
    );
  }
}
```

**查询优化示例** (在基础设施层):

```sql
-- 获取用户D的邀请链
SELECT * FROM user_relationships 
WHERE user_id = 'D' AND depth > 0
ORDER BY depth ASC
LIMIT 10;

-- 获取用户A邀请的所有人
SELECT user_id FROM user_relationships 
WHERE ancestor_id = 'A' AND depth = 1;

-- 获取用户A的一级、二级、三级推荐数
SELECT depth, COUNT(*) as count
FROM user_relationships
WHERE ancestor_id = 'A' AND depth IN (1, 2, 3)
GROUP BY depth;

-- 查询有效索引
CREATE INDEX idx_relationships_ancestor_depth ON user_relationships(ancestor_id, depth);
CREATE INDEX idx_relationships_user_id ON user_relationships(user_id);
```

---

## 三、防腐层(ACL)实现示例

### 🛡️ Identity-Auth ACL Adapter

```typescript
// acl/identity-auth-adapter/identity-auth-facade.ts

/**
 * 防腐层: 隔离不同上下文之间的数据转换
 * 
 * 作用:
 * - Identity Context: User Aggregate
 * - Authentication Context: Session & RefreshTokenFamily
 * 
 * 数据流:
 * Identity(User.username) → Mapper → Auth(Session.userId)
 */
export class IdentityAuthACL {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
  ) {}

  /**
   * Identity → Auth转换
   * 当用户登录时,需要将Identity Context的User转换为Auth Context的Session
   */
  async convertUserToSession(
    username: string,
    loginIp: string,
    deviceInfo: DeviceInfo,
  ): Promise<Session> {
    // 1. 从Identity Context获取User
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. 验证User状态 (Identity Context的业务规则)
    if (!user.isActive()) {
      throw new UserNotActiveException();
    }

    // 3. 创建Session (Auth Context)
    const session = Session.create({
      userId: user.getId(),
      ipAddress: loginIp,
      userAgent: deviceInfo.userAgent,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      loginLocation: deviceInfo.location,
    });

    return session;
  }

  /**
   * Auth → Identity转换
   * 当进行权限检查时,需要将Auth Context的token信息转换回Identity Context
   */
  async convertTokenToUser(
    tokenClaims: TokenClaims,
  ): Promise<User | null> {
    const userId = tokenClaims.sub;

    // 1. 验证token有效性 (Auth Context)
    if (tokenClaims.exp < Date.now() / 1000) {
      return null;
    }

    // 2. 从Identity Context获取User
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    // 3. 检查User状态是否与token信息一致
    if (!user.isActive()) {
      return null;
    }

    return user;
  }
}

// acl/identity-auth-adapter/identity-auth.mapper.ts

export class IdentityAuthMapper {
  static mapUserToSessionDTO(user: User): SessionCreateDTO {
    return {
      userId: user.getId().value,
      username: user.getUsername(),
      email: user.getContact().getEmail().value,
    };
  }

  static mapSessionToAuthContextDTO(session: Session): AuthContextDTO {
    return {
      sessionId: session.getSessionId(),
      userId: session.getUserId().value,
      expiresAt: session.getExpiresAt(),
      isRevoked: session.isRevoked(),
    };
  }
}
```

---

## 四、事件处理示例

### 📡 Domain Event Handler

```typescript
// infrastructure/messaging/event-subscribers/replay-attack-detected.subscriber.ts

export class ReplayAttackDetectedSubscriber
  implements EventSubscriber<ReplayAttackDetectedEvent> {
  
  constructor(
    private sessionRepository: SessionRepository,
    private refreshTokenRepository: RefreshTokenFamilyRepository,
    private notificationService: NotificationService,
    private auditLogger: AuditLogger,
  ) {}

  async handle(event: ReplayAttackDetectedEvent): Promise<void> {
    try {
      // 1. 立即撤销Session
      const session = await this.sessionRepository.findById(event.sessionId);
      if (session) {
        session.revoke('replay_attack_detected');
        await this.sessionRepository.save(session);
      }

      // 2. 撤销整个Token Family
      const tokenFamily = await this.refreshTokenRepository.findById(
        event.tokenFamilyId,
      );
      if (tokenFamily) {
        tokenFamily.revokeFamily('replay_attack_detected');
        await this.refreshTokenRepository.save(tokenFamily);
      }

      // 3. 发送安全警报通知
      await this.notificationService.sendSecurityAlert({
        userId: event.userId,
        type: 'REPLAY_ATTACK_DETECTED',
        severity: 'CRITICAL',
        message: `检测到重放攻击，来自IP: ${event.ipAddress}`,
        action: '已撤销此会话和所有Token',
      });

      // 4. 记录审计日志
      await this.auditLogger.logSecurityEvent({
        userId: event.userId.value,
        action: 'REPLAY_ATTACK_DETECTED',
        level: 'CRITICAL',
        details: {
          family: event.family,
          generation: event.generation,
          ipAddress: event.ipAddress,
        },
        ipAddress: event.ipAddress,
      });

    } catch (error) {
      // 错误处理: 确保事件处理失败时记录日志,但不影响主流程
      this.auditLogger.logError('ReplayAttackDetectedSubscriber', error);
    }
  }
}
```

---

## 五、应用层Command Handler示例

```typescript
// applications/authentication/handlers/refresh-token.handler.ts

export class RefreshTokenHandler
  implements CommandHandler<RefreshTokenCommand> {
  
  constructor(
    private sessionRepository: SessionRepository,
    private tokenFamilyRepository: RefreshTokenFamilyRepository,
    private userRepository: UserRepository,
    private eventBus: EventBus,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    // 1. 验证旧token
    const tokenFamily = await this.tokenFamilyRepository
      .findByTokenHash(command.oldTokenHash);
    
    if (!tokenFamily) {
      throw new InvalidTokenException();
    }

    // 2. 检测重放攻击 (重要!)
    if (!tokenFamily.isTokenValid(command.oldTokenHash)) {
      // Token已使用或已撤销 → 可能是重放攻击
      tokenFamily.detectAndHandleReplayAttack(
        command.oldTokenHash,
        command.ipAddress,
      );

      // 发布事件 (由subscriber处理)
      await this.eventBus.publishAll(tokenFamily.domainEvents);

      throw new ReplayAttackException();
    }

    // 3. 执行Token轮换 (核心逻辑在聚合根)
    const rotationResult = tokenFamily.rotateToken(
      command.oldTokenHash,
      command.newTokenHash,
    );

    // 4. 保存更新
    await this.tokenFamilyRepository.save(tokenFamily);

    // 5. 发布事件
    await this.eventBus.publishAll(tokenFamily.domainEvents);

    // 6. 更新Session活跃时间
    const session = await this.sessionRepository
      .findById(tokenFamily.sessionId);
    if (session) {
      session.updateLastActivity();
      await this.sessionRepository.save(session);
    }

    return {
      newTokenHash: rotationResult.newToken.tokenHash,
      generation: rotationResult.generation,
      expiresAt: rotationResult.newToken.expiresAt,
    };
  }
}
```

---

## 六、仓储实现示例

### 💾 RefreshTokenFamily Repository

```typescript
// infrastructure/database/repositories/refresh-token-family.repository.impl.ts

export class RefreshTokenFamilyRepositoryImpl
  implements RefreshTokenFamilyRepository {
  
  constructor(private db: Database) {}

  async save(tokenFamily: RefreshTokenFamily): Promise<void> {
    // 在事务中保存Token Family及其所有Token
    await this.db.transaction(async (tx) => {
      // 1. 保存或更新family记录
      await tx.insert(userRefreshTokens).values({
        // family级别数据
        family: tokenFamily.family,
        sessionId: tokenFamily.sessionId,
        userId: tokenFamily.userId,
        isRevoked: tokenFamily.isRevoked,
        revokedAt: tokenFamily.revokedAt,
        revokeReason: tokenFamily.revokeReason,
      }).onConflict().doUpdate((oc) =>
        oc.set({
          isRevoked: tokenFamily.isRevoked,
          updatedAt: new Date(),
        })
      );

      // 2. 保存所有tokens
      for (const token of tokenFamily.tokens) {
        await tx.insert(userRefreshTokens).values({
          id: token.id,
          sessionId: tokenFamily.sessionId,
          tokenHash: token.tokenHash,
          family: token.family,
          generation: token.generation,
          parentTokenId: token.parentTokenId,
          isUsed: token.isUsed,
          usedAt: token.usedAt,
          isRevoked: token.isRevoked,
          revokedAt: token.revokedAt,
          revokeReason: token.revokeReason,
          expiresAt: token.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflict().doUpdate((oc) =>
          oc.set({
            isUsed: token.isUsed,
            isRevoked: token.isRevoked,
            updatedAt: new Date(),
          })
        );
      }
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<RefreshTokenFamily | null> {
    const records = await this.db
      .select()
      .from(userRefreshTokens)
      .where(eq(userRefreshTokens.tokenHash, tokenHash));

    if (records.length === 0) return null;

    return this.reconstructAggregate(records);
  }

  async findBySessionId(
    sessionId: string,
  ): Promise<RefreshTokenFamily | null> {
    const records = await this.db
      .select()
      .from(userRefreshTokens)
      .where(eq(userRefreshTokens.sessionId, sessionId));

    if (records.length === 0) return null;

    return this.reconstructAggregate(records);
  }

  private reconstructAggregate(
    records: any[],
  ): RefreshTokenFamily {
    // 从数据库记录重构聚合根
    const familyRecord = records[0];
    const tokenRecords = records;

    const tokens = tokenRecords.map(rec =>
      RefreshToken.reconstruct({
        id: rec.id,
        tokenHash: rec.tokenHash,
        family: rec.family,
        generation: rec.generation,
        parentTokenId: rec.parentTokenId,
        isUsed: rec.isUsed,
        usedAt: rec.usedAt,
        isRevoked: rec.isRevoked,
        revokedAt: rec.revokedAt,
        revokeReason: rec.revokeReason,
        expiresAt: rec.expiresAt,
      }),
    );

    return RefreshTokenFamily.reconstruct({
      id: familyRecord.id,
      sessionId: familyRecord.sessionId,
      userId: familyRecord.userId,
      family: familyRecord.family,
      tokens,
      isRevoked: familyRecord.isRevoked,
      revokeReason: familyRecord.revokeReason,
    });
  }
}
```

---

## 七、测试示例

```typescript
// __test__/unit/domains/authentication/refresh-token-family.spec.ts

describe('RefreshTokenFamily Aggregate', () => {
  let tokenFamily: RefreshTokenFamily;

  beforeEach(() => {
    const sessionId = 'session-123';
    const userId = UserId.create('user-123');
    const tokenHash = 'token-hash-v1';

    tokenFamily = RefreshTokenFamily.createNewFamily(
      sessionId,
      userId,
      tokenHash,
    );
  });

  describe('rotateToken', () => {
    it('应该成功轮换token并递增generation', () => {
      // Arrange
      const oldTokenHash = tokenFamily.getLatestToken().tokenHash;
      const newTokenHash = 'token-hash-v2';

      // Act
      const result = tokenFamily.rotateToken(
        oldTokenHash,
        newTokenHash,
      );

      // Assert
      expect(result.generation).toBe(2);
      expect(result.newToken.tokenHash).toBe(newTokenHash);
      expect(
        tokenFamily.getLatestToken().generation,
      ).toBe(2);
    });

    it('应该发布RefreshTokenRotatedEvent', () => {
      // Arrange
      const oldTokenHash = tokenFamily.getLatestToken().tokenHash;
      const newTokenHash = 'token-hash-v2';

      // Act
      tokenFamily.rotateToken(oldTokenHash, newTokenHash);

      // Assert
      const events = tokenFamily.domainEvents;
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1]).toBeInstanceOf(
        RefreshTokenRotatedEvent,
      );
    });
  });

  describe('detectAndHandleReplayAttack', () => {
    it('应该在已使用的token再次使用时撤销family', () => {
      // Arrange: 先轮换一次token
      const oldToken = tokenFamily.getLatestToken();
      const newTokenHash = 'token-hash-v2';
      tokenFamily.rotateToken(oldToken.tokenHash, newTokenHash);

      // 清空事件队列
      tokenFamily.clearDomainEvents();

      // Act: 尝试再次使用已使用的token
      tokenFamily.detectAndHandleReplayAttack(
        oldToken.tokenHash,
        '192.168.1.1',
      );

      // Assert
      expect(tokenFamily.isRevoked).toBe(true);
      const events = tokenFamily.domainEvents;
      expect(events.some(e =>
        e instanceof ReplayAttackDetectedEvent,
      )).toBe(true);
    });
  });

  describe('isTokenValid', () => {
    it('应该在未过期、未使用、未撤销时返回true', () => {
      const token = tokenFamily.getLatestToken();
      expect(tokenFamily.isTokenValid(token.tokenHash)).toBe(true);
    });

    it('应该在family被撤销时返回false', () => {
      tokenFamily.revokeFamily('test_reason');
      const token = tokenFamily.getLatestToken();
      expect(tokenFamily.isTokenValid(token.tokenHash)).toBe(false);
    });
  });
});
```

