import { defineConfig } from "vitest/config"

/** Security-rules tests: node environment, against the Firestore emulator. */
export default defineConfig({
  test: {
    include: ["rules-tests/**/*.test.ts"],
    environment: "node",
    testTimeout: 20_000,
  },
})
