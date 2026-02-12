import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "src/lib/utils.ts",
        "src/lib/checkout-api.ts",
        "src/lib/supabase.ts",
        "src/hooks/useCart.ts",
        "src/hooks/useSupabase.ts",
        "src/data/products.ts",
        "src/components/products/ProductCard.tsx",
        "src/components/layout/Footer.tsx",
        "src/components/layout/Header.tsx",
        "src/components/home/HeroSection.tsx",
        "src/pages/NotFound.tsx",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
