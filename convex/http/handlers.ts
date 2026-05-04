import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

declare const process: { env: Record<string, string | undefined> };

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Fetch user from Discord
async function getDiscordUser(accessToken: string) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Discord user");
  }

  return response.json();
}

function requireEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  const missing = names.join(" or ");
  throw new Error(`Missing required environment variable: ${missing}`);
}

// Exchange Discord code for access token
async function getDiscordAccessToken(code: string) {
  const clientId = requireEnv(["DISCORD_CLIENT_ID", "VITE_DISCORD_CLIENT_ID"]);
  const clientSecret = requireEnv(["DISCORD_CLIENT_SECRET"]);
  const redirectUri = requireEnv([
    "DISCORD_REDIRECT_URI",
    "VITE_DISCORD_REDIRECT_URI",
  ]);

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error_description || "Failed to exchange code for token"
    );
  }

  const data = await response.json();
  return data.access_token as string;
}

// Auth callback handler
export const authCallback = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const { code, username, inviteCode } = body;

    if (!code || !username) {
      return new Response(
        JSON.stringify({ error: "Missing code or username" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Exchange Discord code for access token
    const accessToken = await getDiscordAccessToken(code);

    // Get Discord user info
    const discordUser = await getDiscordUser(accessToken);

    // Create/update user in database
    const { user, isNew } = await ctx.runMutation(api.functions.upsertUser, {
      discordId: discordUser.id,
      username,
    });

    if (isNew) {
      try {
        await ctx.runAction(api.zipline.createZiplineInvite, {
          discordId: discordUser.id,
          maxUses: 1,
        });
      } catch (ziplineError) {
        console.warn("Zipline invite creation failed:", ziplineError);
      }
    }

    // Use invite if provided
    if (inviteCode) {
      try {
        await ctx.runMutation(api.functions.useInvite, {
          code: inviteCode,
          discordId: discordUser.id,
        });
      } catch (inviteError) {
        console.warn("Failed to use invite:", inviteError);
      }
    }

    return new Response(
      JSON.stringify({
        discordId: discordUser.id,
        username: username,
        _id: user?._id,
        createdAt: user?.createdAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Auth callback error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Authentication failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// Admin check handler
export const adminCheck = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const discordId = request.headers.get("X-Discord-ID");

    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const registered = await ctx.runMutation(
      api.functions.registerAdminIfAuthorized,
      { discordId }
    );
    const isAdmin =
      registered || (await ctx.runQuery(api.functions.isAdmin, { discordId }));

    return new Response(JSON.stringify({ isAdmin }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin check error:", error);
    return new Response(JSON.stringify({ isAdmin: false }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Register admin if authorized
export const registerAdminIfAuthorized = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const { discordId } = body;

    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const registered = await ctx.runMutation(
      api.functions.registerAdminIfAuthorized,
      { discordId }
    );

    return new Response(JSON.stringify({ success: registered }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Registration failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// Get all invites
export const getInvites = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const invites = await ctx.runQuery(api.functions.getAllInvites, {});

    return new Response(JSON.stringify(invites), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get invites error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch invites" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Generate invite
export const generateInvite = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.json();
    const { createdBy } = body;

    if (!createdBy) {
      return new Response(JSON.stringify({ error: "Missing createdBy" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const invite = await ctx.runMutation(api.functions.generateInvite, {
      createdBy,
    });

    return new Response(JSON.stringify(invite), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate invite error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate invite" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

export const createZiplineInvite = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const discordId = request.headers.get("X-Discord-ID");
    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin = await ctx.runQuery(api.functions.isAdmin, { discordId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const expiresAt = body?.expiresAt;
    const maxUses = body?.maxUses;
    const targetDiscordId = body?.discordId || discordId;

    const invite = await ctx.runAction(api.zipline.createZiplineInvite, {
      discordId: targetDiscordId,
      expiresAt,
      maxUses,
    });

    return new Response(JSON.stringify(invite), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create Zipline invite error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create Zipline invite" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export const getZiplineInvitesForUser = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const discordId = request.headers.get("X-Discord-ID");
    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const invites = await ctx.runQuery(
      api.functions.getZiplineInvitesForDiscordId,
      { discordId }
    );

    return new Response(JSON.stringify(invites), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get Zipline invites error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Zipline invites" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export const getAllZiplineInvites = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const discordId = request.headers.get("X-Discord-ID");
    if (!discordId) {
      return new Response(JSON.stringify({ error: "Missing Discord ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isAdmin = await ctx.runQuery(api.functions.isAdmin, { discordId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const invites = await ctx.runQuery(api.functions.getAllZiplineInvites, {});

    return new Response(JSON.stringify(invites), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get Zipline invites error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Zipline invites" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

export const getWhitelistedIds = httpAction(async (ctx, request) => {
  try {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const ids = await ctx.runQuery(api.functions.getWhitelistedDiscordIds, {});
    const hashedIds = await Promise.all(ids.map((id) => sha256Hex(id)));

    return new Response(JSON.stringify({ ids: hashedIds }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get whitelisted IDs error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch ids" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
