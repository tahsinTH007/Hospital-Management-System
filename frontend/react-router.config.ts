import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Vercel sets VERCEL=1 during its builds. Only then use its preset, so a
  // plain `react-router build` (Docker, other hosts) keeps the standard
  // build/server/index.js layout that `bun run start` expects.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
