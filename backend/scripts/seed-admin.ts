/**
 * Creates (or updates) the first administrator account.
 *
 *   bun run seed:admin
 *   bun run seed:admin -- --username tahsin --password tahsin --email tahsin@medflow.com --name "Tahsin Hassan"
 *
 * Values can also come from ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL / ADMIN_NAME.
 * Safe to run repeatedly: an existing user (matched by email) gets its role,
 * username and password updated instead of being duplicated.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.ts";
import { auth } from "../src/lib/auth.ts";

const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
};

const username = (arg("username") ?? process.env.ADMIN_USERNAME ?? "tahsin").toLowerCase();
const password = arg("password") ?? process.env.ADMIN_PASSWORD ?? "tahsin";
const email = (arg("email") ?? process.env.ADMIN_EMAIL ?? `${username}@medflow.com`).toLowerCase();
const name = arg("name") ?? process.env.ADMIN_NAME ?? "Tahsin Hassan";

const main = async () => {
  await connectDB();
  const users = mongoose.connection.collection("user");
  const ctx = await auth.$context;

  const existing = await users.findOne({ email });

  if (!existing) {
    // Go through Better Auth so the account/credential records are created
    // exactly like a normal sign-up.
    const result = await auth.api.signUpEmail({
      body: { name, email, password, username } as any,
    });
    await users.updateOne(
      { _id: new mongoose.Types.ObjectId(result.user.id) },
      { $set: { role: "admin", status: "active", emailVerified: true } },
    );
    console.log(`✅ Created admin ${email} (username: ${username})`);
  } else {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          name,
          role: "admin",
          status: "active",
          username,
          displayUsername: username,
          emailVerified: true,
        },
      },
    );
    const hash = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(existing._id.toString(), hash);
    console.log(`✅ Updated admin ${email} (username: ${username}) and reset its password`);
  }
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
