const REQUIRED_VARS = [
  "DATABASE_URL",
] as const;

const RECOMMENDED_VARS = [
  "SECONDME_CLIENT_ID",
  "SECONDME_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
] as const;

let validated = false;

export function validateEnv() {
  if (validated) return;
  validated = true;

  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const missingRecommended = RECOMMENDED_VARS.filter((v) => !process.env[v]);
  if (missingRecommended.length > 0 && process.env.NODE_ENV === "production") {
    // Use console.warn directly here since this runs at startup before logger may be ready
    console.warn(`[env] Missing recommended environment variables: ${missingRecommended.join(", ")}`);
  }
}
