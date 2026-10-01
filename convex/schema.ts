import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    username: v.string(),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    isPrivate: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  posts: defineTable({
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  comments: defineTable({
    postId: v.id("posts"),
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_userId", ["userId"]),

  likes: defineTable({
    postId: v.id("posts"),
    userId: v.string(),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_userId", ["userId"])
    .index("by_postId_and_userId", ["postId", "userId"]),

  follows: defineTable({
    followerId: v.string(),
    followingId: v.string(),
    createdAt: v.number(),
  })
    .index("by_followerId", ["followerId"])
    .index("by_followingId", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  stories: defineTable({
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),

  communities: defineTable({
    ownerId: v.string(),
    name: v.string(),
    description: v.string(),
    isPrivate: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_name", ["name"]),

  conversations: defineTable({
    userA: v.string(),
    userB: v.string(),
    createdAt: v.number(),
  })
    .index("by_userA", ["userA"])
    .index("by_userB", ["userB"])
    .index("by_pair", ["userA", "userB"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_senderId", ["senderId"]),

  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    postId: v.optional(v.id("posts")),
    body: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),
});
