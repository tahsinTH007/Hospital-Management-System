/**
 * Creates (or updates) the first administrator account.
 *
 *   bun run seed:admin
 *   bun run seed:admin -- --username tahsin --password tahsin --email tahsin@medflow.com --name "Tahsin Hassan"
 *
 * Values can also come from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL / ADMIN_NAME.
 * Safe to run repeatedly: an existing user (matched by email) gets its role,
 * username and password updated instead of being duplicated.
 *
 * Demo mode signs visitors in with this same account (see src/lib/adminAccount.ts).
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.ts";
import { ADMIN_ACCOUNT, upsertAdminAccount } from "../src/lib/adminAccount.ts";

const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
};

const username = (arg("username") ?? ADMIN_ACCOUNT.username).toLowerCase();
const password = arg("password") ?? ADMIN_ACCOUNT.password;
const email = (
  arg("email") ??
  process.env.ADMIN_EMAIL ??
  `${username}@medflow.com`
).toLowerCase();
const name = arg("name") ?? ADMIN_ACCOUNT.name;

const main = async () => {
  await connectDB();
  const created = await upsertAdminAccount({ username, password, email, name });
  console.log(
    created
      ? `✅ Created admin ${email} (username: ${username})`
      : `✅ Updated admin ${email} (username: ${username}) and reset its password`,
  );
};

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    // Better Auth keeps its own MongoClient open; nothing else is pending.
    process.exit();
  });
