CREATE TABLE "rapid_s"."permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"parent_id" uuid,
	"type" varchar(20) NOT NULL,
	"resource" varchar(255),
	"sort_priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."role_permission_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."user_role_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"assigned_by" uuid,
	"assign_reason" text,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"nickname" varchar(100),
	"email" varchar(255),
	"phone" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"avatar_url" text,
	"bio" text,
	"gender" integer DEFAULT 0 NOT NULL,
	"birth_date" timestamp,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"status" varchar(30) DEFAULT 'pending_verification' NOT NULL,
	"lock_reason" text,
	"locked_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"last_login_ip" varchar(50),
	"password_changed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."user_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint" varchar(255) NOT NULL,
	"device_name" varchar(255),
	"device_type" varchar(50),
	"browser_info" varchar(255),
	"os_info" varchar(255),
	"last_ip_address" varchar(50),
	"last_location" varchar(255),
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"is_trusted" boolean DEFAULT false NOT NULL,
	"trusted_at" timestamp,
	"trust_expires_at" timestamp,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"disabled_reason" text,
	"disabled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."user_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"family" varchar(255) NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"parent_token_id" uuid,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"revoke_reason" varchar(100),
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rapid_s"."user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"device_id" uuid,
	"login_location" varchar(255),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp,
	"revoke_reason" varchar(100),
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE INDEX "idx_permissions_code" ON "rapid_s"."permissions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_permissions_parent_id" ON "rapid_s"."permissions" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_permissions_type" ON "rapid_s"."permissions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_permissions_active_deleted" ON "rapid_s"."permissions" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "idx_role_permission_mappings_role_id" ON "rapid_s"."role_permission_mappings" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permission_mappings_permission_id" ON "rapid_s"."role_permission_mappings" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_role_permission_mappings_role_permission" ON "rapid_s"."role_permission_mappings" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "idx_roles_code" ON "rapid_s"."roles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_roles_level" ON "rapid_s"."roles" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_roles_active_deleted" ON "rapid_s"."roles" USING btree ("is_active","is_deleted");--> statement-breakpoint
CREATE INDEX "idx_user_role_mappings_user_id" ON "rapid_s"."user_role_mappings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_mappings_role_id" ON "rapid_s"."user_role_mappings" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_mappings_user_role" ON "rapid_s"."user_role_mappings" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "idx_user_role_mappings_effective" ON "rapid_s"."user_role_mappings" USING btree ("effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "idx_user_role_mappings_is_revoked" ON "rapid_s"."user_role_mappings" USING btree ("is_revoked");--> statement-breakpoint
CREATE INDEX "idx_users_username" ON "rapid_s"."users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "rapid_s"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "rapid_s"."users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "rapid_s"."users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_users_status_deleted" ON "rapid_s"."users" USING btree ("status","is_deleted");--> statement-breakpoint
CREATE INDEX "idx_users_last_login_at" ON "rapid_s"."users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "idx_user_devices_user_id" ON "rapid_s"."user_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_devices_fingerprint" ON "rapid_s"."user_devices" USING btree ("user_id","device_fingerprint");--> statement-breakpoint
CREATE INDEX "idx_user_devices_trusted" ON "rapid_s"."user_devices" USING btree ("user_id","is_trusted");--> statement-breakpoint
CREATE INDEX "idx_user_devices_last_active" ON "rapid_s"."user_devices" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "idx_user_devices_status" ON "rapid_s"."user_devices" USING btree ("user_id","is_disabled");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_token_hash" ON "rapid_s"."user_refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_session_id" ON "rapid_s"."user_refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_family" ON "rapid_s"."user_refresh_tokens" USING btree ("family");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_session_status" ON "rapid_s"."user_refresh_tokens" USING btree ("session_id","is_used","is_revoked");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_family_generation" ON "rapid_s"."user_refresh_tokens" USING btree ("family","generation");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_parent_token_id" ON "rapid_s"."user_refresh_tokens" USING btree ("parent_token_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_expires_at" ON "rapid_s"."user_refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_validity" ON "rapid_s"."user_refresh_tokens" USING btree ("is_used","is_revoked","expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "rapid_s"."user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_session_id" ON "rapid_s"."user_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_revoked" ON "rapid_s"."user_sessions" USING btree ("user_id","is_revoked");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_device_id" ON "rapid_s"."user_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_expires_at" ON "rapid_s"."user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_last_activity_at" ON "rapid_s"."user_sessions" USING btree ("last_activity_at");