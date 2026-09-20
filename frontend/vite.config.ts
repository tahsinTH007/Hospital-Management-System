import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Same-origin API in development: /api/* is proxied to the backend so the
  // session cookie stays first-party (mirrors the /api rewrite on Vercel).
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: false,
        },
      },
    },
  };
});
