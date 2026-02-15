import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src"),
    },
  },
  test: {
    include: ["src/__tests__/**/*.test.ts"],
  },
});
