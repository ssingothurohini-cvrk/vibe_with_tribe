import type { AuthConfig } from "convex/server";

const issuer = process.env.SUPABASE_AUTH_ISSUER;

export default {
  providers: issuer
    ? [{ domain: issuer, applicationID: "authenticated" }]
    : [],
} satisfies AuthConfig;
