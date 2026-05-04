import { httpRouter } from "convex/server";
import {
  authCallback,
  adminCheck,
  registerAdminIfAuthorized,
  getInvites,
  generateInvite,
  createZiplineInvite,
  getZiplineInvitesForUser,
  getAllZiplineInvites,
  getWhitelistedIds,
} from "./http/handlers";
const http = httpRouter();

http.route({
  path: "/auth/callback",
  method: "POST",
  handler: authCallback,
});

http.route({
  path: "/auth/adminCheck",
  method: "GET",
  handler: adminCheck,
});

http.route({
  path: "/auth/invites",
  method: "POST",
  handler: createZiplineInvite,
});

http.route({
  path: "/auth/invites",
  method: "GET",
  handler: getZiplineInvitesForUser,
});

http.route({
  path: "/admin/registerIfAuthorized",
  method: "POST",
  handler: registerAdminIfAuthorized,
});

http.route({
  path: "/admin/invites",
  method: "GET",
  handler: getInvites,
});

http.route({
  path: "/admin/generateInvite",
  method: "POST",
  handler: generateInvite,
});

http.route({
  path: "/admin/zipline-invites",
  method: "GET",
  handler: getAllZiplineInvites,
});

http.route({
  path: "/ids",
  method: "GET",
  handler: getWhitelistedIds,
});

export default http;
