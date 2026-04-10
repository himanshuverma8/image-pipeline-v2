import { uuid, text, timestamp, integer, jsonb, boolean, index, uniqueIndex, pgTable } from "drizzle-orm/pg-core";

 //users table
 export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    googleId: text("google_id").notNull().unique(),
    storagePrefix: text("storage_prefix").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
 })

 //api keys table
 export const apiKeys = pgTable("api_keys", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    keyHash: text("key_hash").notNull(),
    keySalt: text("key_salt").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    name: text("name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
 }, (table) => [
    index("api_keys_hash_idx").on(table.keyHash),
 ])

 //images table
 export const images = pgTable("images", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    originalKey: text("original_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    tags: text("tags").array(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
 }, (table) => [
    index("images_user_uploaded_idx").on(table.userId, table.uploadedAt),
 ])

 //cached transformations
 export const transformations = pgTable("transformations", {
    id: uuid("id").defaultRandom().primaryKey(),
    imageId: uuid("image_id").notNull().references(() => images.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    paramsHash: text("params_hash").notNull(),
    transformedKey: text("transformed_key").notNull(),
    cdnUrl: text("cdn_url").notNull(),
    params: jsonb("params").notNull(),
    outputSizeBytes: integer("output_size_bytes"),
    processingTimeMs: integer("processing_time_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
 }, (table) => [
    uniqueIndex("transformation_image_params_idx").on(table.imageId, table.paramsHash),
 ])

 //usage logs - for rate limiting and analytics
 export const userLogs = pgTable("usage_logs", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id),
    requestId: uuid("request_id").notNull(),
    action: text("action").notNull(),
    metadata: jsonb("metadata"),
    durationMs: integer("duration_ms"),
    statusCode: integer("status_code"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    requestIp: text("request_ip"),
 }, (table) => [
    index("usage_logs_api_key_ts_idx").on(table.apiKeyId, table.timestamp),
    index("usage_logs_user_ts_idx").on(table.userId, table.timestamp)
 ])