import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const appVersion = env.APP_VERSION?.trim() || "0.0.0";
  const frontendOutDir = "dist-app";

  return {
    root: __dirname,
    plugins: [vue()],
    build: {
      outDir: frontendOutDir,
      emptyOutDir: true
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    server: {
      port: 5174
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src")
      }
    }
  };
});
