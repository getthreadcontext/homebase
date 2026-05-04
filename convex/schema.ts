import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    discordId: v.string(),
    username: v.string(),
    createdAt: v.number(),
    lastLogin: v.number(),
  })
    .index("by_discordId", ["discordId"])
    .index("by_username", ["username"]),

  invites: defineTable({
    code: v.string(),
    used: v.boolean(),
    usedBy: v.optional(v.string()),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.string(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_used", ["used"]),

  admins: defineTable({
    discordId: v.string(),
    createdAt: v.number(),
  })
    .index("by_discordId", ["discordId"]),

  config: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  services: defineTable({
    name: v.string(),
    url: v.string(),
    apiKey: v.optional(v.string()),
    active: v.boolean(),
  })
    .index("by_name", ["name"]),

  ziplineInvites: defineTable({
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
  })
    .index("by_discordId", ["discordId"])
    .index("by_inviteId", ["inviteId"]),
});
