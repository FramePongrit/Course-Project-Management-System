/**
 * Password of the seeded demo accounts. It is never hard-coded: it comes from the environment
 * (.env locally, the CI job env, or Secret Manager in the cloud) — the same DEMO_USER_PASSWORD
 * that prisma/seed.ts used to create the accounts.
 */
const value = process.env.DEMO_USER_PASSWORD;
if (!value) {
  throw new Error("DEMO_USER_PASSWORD must be set (copy .env.example to .env) to run the tests");
}
export const DEMO_PASSWORD: string = value;
