import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setupEnv.ts"],
    // Os testes de integração compartilham o mesmo banco
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
