import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

declare const process: { env: Record<string, string | undefined> };

function parseAdminIds(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

async function readAdminIds(ctx: { db: any }) {
  const config = await ctx.db
    .query("config")
    .withIndex("by_key", (q: any) => q.eq("key", "ADMIN_IDS"))
    .first();

  const configIds = parseAdminIds(config?.value);
  const envIds = parseAdminIds(process.env.ADMIN_IDS);
  return Array.from(new Set([...configIds, ...envIds]));
}

// Initialize admin IDs in database (call once during setup)
export const initializeAdminIds = mutation({
  args: { adminIds: v.string() },
  handler: async (ctx, args) => {
    // Store admin IDs in config table
    const existing = await ctx.db
      .query("config")
      .withIndex("by_key", (q) => q.eq("key", "ADMIN_IDS"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.adminIds,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("config", {
        key: "ADMIN_IDS",
        value: args.adminIds,
        updatedAt: Date.now(),
      });
    }
    return true;
  },
});

export const getWhitelistedDiscordIds = query({
  args: {},
  handler: async (ctx) => {
    return await readAdminIds(ctx);
  },
});

export const getAllDiscordIds = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const userIds = users.map((user) => user.discordId);
    const adminIds = await readAdminIds(ctx);
    return Array.from(new Set([...userIds, ...adminIds]));
  },
});

// Auto-register admin if their Discord ID matches stored ADMIN_IDS
export const registerAdminIfAuthorized = mutation({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    const adminIds = await readAdminIds(ctx);

    if (adminIds.includes(args.discordId)) {
      const existing = await ctx.db
        .query("admins")
        .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
        .first();

      if (!existing) {
        await ctx.db.insert("admins", {
          discordId: args.discordId,
          createdAt: Date.now(),
        });
      }
      return true;
    }
    return false;
  },
});

// Check if user is admin
export const isAdmin = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();
    return !!admin;
  },
});

// Get user by Discord ID
export const getUserByDiscordId = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();
  },
});

// Create or update user after auth
export const upsertUser = mutation({
  args: {
    discordId: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastLogin: Date.now(),
      });
      return { user: existing, isNew: false };
    }

    const newUserId = await ctx.db.insert("users", {
      discordId: args.discordId,
      username: args.username,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    });

    const user = await ctx.db.get(newUserId);
    return { user, isNew: true };
  },
});

// Generate invite code
export const generateInvite = mutation({
  args: { createdBy: v.string() },
  handler: async (ctx, args) => {
    const code = Math.random().toString(36).substring(2, 15);

    const inviteId = await ctx.db.insert("invites", {
      code,
      used: false,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    return await ctx.db.get(inviteId);
  },
});

// Get invite by code
export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

// Use invite
export const useInvite = mutation({
  args: {
    code: v.string(),
    discordId: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.used) {
      throw new Error("Invite already used");
    }

    await ctx.db.patch(invite._id, {
      used: true,
      usedBy: args.discordId,
      usedAt: Date.now(),
    });

    return true;
  },
});

// Get all invites (admin)
export const getAllInvites = query({
  handler: async (ctx) => {
    return await ctx.db.query("invites").collect();
  },
});

// Get unused invites count
export const getUnusedInvitesCount = query({
  handler: async (ctx) => {
    const unused = await ctx.db
      .query("invites")
      .withIndex("by_used", (q) => q.eq("used", false))
      .collect();
    return unused.length;
  },
});

export const saveZiplineInvite = mutation({
  args: {
    discordId: v.string(),
    inviteId: v.string(),
    code: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
    uses: v.number(),
    maxUses: v.optional(v.number()),
    inviterId: v.string(),
    inviterUsername: v.string(),
    inviterRole: v.string(),
    raw: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("ziplineInvites")
      .withIndex("by_inviteId", (q) => q.eq("inviteId", args.inviteId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        discordId: args.discordId,
        code: args.code,
        createdAt: args.createdAt,
        updatedAt: args.updatedAt,
        expiresAt: args.expiresAt,
        uses: args.uses,
        maxUses: args.maxUses,
        inviterId: args.inviterId,
        inviterUsername: args.inviterUsername,
        inviterRole: args.inviterRole,
        raw: args.raw,
      });
      return existing._id;
    }

    return await ctx.db.insert("ziplineInvites", {
      discordId: args.discordId,
      inviteId: args.inviteId,
      code: args.code,
      createdAt: args.createdAt,
      updatedAt: args.updatedAt,
      expiresAt: args.expiresAt,
      uses: args.uses,
      maxUses: args.maxUses,
      inviterId: args.inviterId,
      inviterUsername: args.inviterUsername,
      inviterRole: args.inviterRole,
      raw: args.raw,
    });
  },
});

export const getZiplineInvitesForDiscordId = query({
  args: { discordId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("ziplineInvites")
      .withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
      .collect();
  },
});

export const getAllZiplineInvites = query({
  handler: async (ctx) => {
    return await ctx.db.query("ziplineInvites").collect();
  },
});
