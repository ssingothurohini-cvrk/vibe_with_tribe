import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const normalizeProfile = (profile: any) => ({
  ...profile,
  id: profile._id,
  createdAt: profile.createdAt ?? profile._creationTime,
});

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").order("desc").take(50);
    return profiles.map(normalizeProfile);
  },
});

export const getProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return profile ? normalizeProfile(profile) : null;
  },
});

export const upsertProfile = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    fullName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    const profile = {
      userId: args.userId,
      username: args.username,
      fullName: args.fullName,
      email: args.email,
      avatarUrl: args.avatarUrl,
      bio: args.bio,
      isPrivate: args.isPrivate ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, profile);
      return normalizeProfile({ ...profile, _id: existing._id, _creationTime: existing._creationTime });
    }

    const id = await ctx.db.insert("profiles", profile);
    const stored = await ctx.db.get(id);
    return stored ? normalizeProfile(stored) : null;
  },
});

export const getFeed = query({
  args: { userId: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const posts = await ctx.db.query("posts").order("desc").take(limit);

    const result = await Promise.all(
      posts.map(async (post) => {
        const likes = await ctx.db
          .query("likes")
          .withIndex("by_postId", (q) => q.eq("postId", post._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_postId", (q) => q.eq("postId", post._id))
          .order("asc")
          .collect();
        const isLiked = args.userId
          ? Boolean(
              await ctx.db
                .query("likes")
                .withIndex("by_postId_and_userId", (q) => q.eq("postId", post._id).eq("userId", args.userId!))
                .first(),
            )
          : false;

        return {
          ...post,
          id: post._id,
          likesCount: likes.length,
          comments: comments.map((comment) => ({
            id: comment._id,
            username: comment.username,
            body: comment.body,
            createdAt: comment.createdAt,
          })),
          isLiked,
        };
      }),
    );

    return result;
  },
});

export const createPost = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    location: v.optional(v.string()),
    caption: v.string(),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("posts", {
      userId: args.userId,
      username: args.username,
      avatarUrl: args.avatarUrl,
      location: args.location,
      caption: args.caption,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      createdAt: now,
      updatedAt: now,
    });
    const created = await ctx.db.get(id);
    return created ? normalizeProfile(created) : null;
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("posts"), userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("likes")
      .withIndex("by_postId_and_userId", (q) => q.eq("postId", args.postId).eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { liked: false };
    }

    await ctx.db.insert("likes", {
      postId: args.postId,
      userId: args.userId,
      createdAt: Date.now(),
    });
    return { liked: true };
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.body.trim()) {
      return null;
    }

    const id = await ctx.db.insert("comments", {
      postId: args.postId,
      userId: args.userId,
      username: args.username,
      avatarUrl: args.avatarUrl,
      body: args.body.trim(),
      createdAt: Date.now(),
    });

    const comment = await ctx.db.get(id);
    return comment ? { id: comment._id, username: comment.username, body: comment.body } : null;
  },
});

export const toggleFollow = mutation({
  args: { followerId: v.string(), followingUsername: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.followingUsername))
      .first();

    if (!profile) {
      return { followed: false };
    }

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) => q.eq("followerId", args.followerId).eq("followingId", profile.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { followed: false };
    }

    await ctx.db.insert("follows", {
      followerId: args.followerId,
      followingId: profile.userId,
      createdAt: Date.now(),
    });
    return { followed: true };
  },
});

export const listStories = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_expiresAt", (q) => q.gt("expiresAt", now))
      .order("desc")
      .take(30);

    return stories.map((story) => ({
      ...story,
      id: story._id,
      kind: story.mediaType === "video" ? "video" : undefined,
    }));
  },
});

export const createStory = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    mediaUrl: v.string(),
    mediaType: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("stories", {
      userId: args.userId,
      username: args.username,
      avatarUrl: args.avatarUrl,
      mediaUrl: args.mediaUrl,
      mediaType: args.mediaType,
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    });
    return (await ctx.db.get(id)) ? { id } : null;
  },
});

export const listCommunities = query({
  args: {},
  handler: async (ctx) => {
    const communities = await ctx.db.query("communities").order("desc").take(20);
    return communities.map((community) => ({
      ...community,
      id: community._id,
    }));
  },
});

export const createCommunity = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    description: v.string(),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("communities", {
      ownerId: args.ownerId,
      name: args.name.trim(),
      description: args.description.trim(),
      isPrivate: args.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    });
    return (await ctx.db.get(id)) ? { id } : null;
  },
});

export const getConversation = mutation({
  args: { userA: v.string(), userB: v.string() },
  handler: async (ctx, args) => {
    const a = [args.userA, args.userB].sort();
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_pair", (q) => q.eq("userA", a[0]).eq("userB", a[1]))
      .first();

    if (existing) {
      return existing._id;
    }

    const id = await ctx.db.insert("conversations", {
      userA: a[0],
      userB: a[1],
      createdAt: Date.now(),
    });
    return id;
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    senderId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.body.trim();
    if (!trimmed) {
      return null;
    }

    const id = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: args.senderId,
      body: trimmed,
      createdAt: Date.now(),
    });

    const message = await ctx.db.get(id);
    return message ? { id: message._id, body: message.body } : null;
  },
});

export const listNotifications = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    return notifications.map((notification) => ({
      ...notification,
      id: notification._id,
    }));
  },
});
