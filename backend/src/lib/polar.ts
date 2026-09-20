import { Polar } from "@polar-sh/sdk";

export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});

interface PolarUser {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * Users are created without touching Polar (staff never pay anything).
 * A Polar customer is created lazily the first time a patient needs billing,
 * keyed by `externalId` = our user id.
 */
export const ensurePolarCustomer = async (user: PolarUser) => {
  try {
    return await polarClient.customers.getExternal({ externalId: user.id });
  } catch {
    // Not found by external id – fall through.
  }

  const { result } = await polarClient.customers.list({ email: user.email });
  const existing = result.items[0];
  if (existing) {
    if (existing.externalId === user.id) return existing;
    return polarClient.customers.update({
      id: existing.id,
      customerUpdate: { externalId: user.id },
    });
  }

  return polarClient.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    externalId: user.id,
  });
};
