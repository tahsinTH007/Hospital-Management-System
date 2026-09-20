import mongoose from "mongoose";
import { auth } from "./auth.ts";

export interface AdminAccount {
  username: string;
  password: string;
  email: string;
  name: string;
}

/**
 * The primary administrator. `bun run seed:admin` creates it and demo mode
 * signs visitors in with it, so both read the same ADMIN_* variables.
 */
export const ADMIN_ACCOUNT: AdminAccount = (() => {
  const username = (process.env.ADMIN_USERNAME ?? "tahsin").toLowerCase();
  return {
    username,
    password: process.env.ADMIN_PASSWORD ?? "tahsin",
    email: (process.env.ADMIN_EMAIL ?? `${username}@medflow.com`).toLowerCase(),
    name: process.env.ADMIN_NAME ?? "Tahsin Hassan",
  };
})();

/**
 * Creates the admin account, or – when a user with that email already
 * exists – makes it an admin again and resets its username and password.
 * Returns true when the account was created.
 */
export const upsertAdminAccount = async (
  account: AdminAccount = ADMIN_ACCOUNT,
): Promise<boolean> => {
  const { username, password, email, name } = account;
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
    return true;
  }

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
  return false;
};
