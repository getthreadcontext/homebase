import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

function requireEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  const missing = names.join(" or ");
  throw new Error(`Missing required environment variable: ${missing}`);
}

export const createZiplineInvite = action({
  args: {
    discordId: v.string(),
    expiresAt: v.optional(v.string()),
    maxUses: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiUrl = requireEnv(["ZIPLINE_API_URL"]);
    const apiToken = requireEnv(["ZIPLINE_API_TOKEN"]);

    const payload: Record<string, unknown> = {
      // Zipline expects a string or "never" for expiresAt.
      expiresAt: args.expiresAt ?? "never",
    };
    if (typeof args.maxUses === "number") payload.maxUses = args.maxUses;

    const response = await fetch(`${apiUrl}/api/auth/invites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiToken,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Zipline invite failed: ${response.status} ${response.statusText} ${errorText}`
      );
    }

    const invite = await response.json();

    await ctx.runMutation(api.functions.saveZiplineInvite, {
      discordId: args.discordId,
      inviteId: invite.id,
      code: invite.code,
      createdAt: Date.parse(invite.createdAt),
      updatedAt: Date.parse(invite.updatedAt),
      expiresAt: invite.expiresAt ? Date.parse(invite.expiresAt) : undefined,
      uses: invite.uses,
      maxUses: invite.maxUses ?? undefined,
      inviterId: invite.inviterId,
      inviterUsername: invite.inviter?.username || "unknown",
      inviterRole: invite.inviter?.role || "USER",
      raw: JSON.stringify(invite),
    });

    return invite;
  },
});
