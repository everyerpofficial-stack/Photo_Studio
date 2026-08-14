// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // This app deploys to Vercel (see vercel.json), not Cloudflare — override the
  // Lovable default so Nitro emits a Vercel-compatible server instead of a
  // Cloudflare Worker (which Vercel cannot run, causing every request to 500).
  nitro: {
    preset: "vercel",
  },
  // Forces the SSR server bundle into a single file instead of Rolldown's
  // default chunk-splitting. Without this, Nitro's Vercel preset code-splits
  // @tanstack/react-start's server entry into two chunks that circularly
  // import from each other, and framework-internal code (e.g. the default
  // CSRF middleware) gets called before the chunk defining it has finished
  // initializing — crashing every request in production with errors like
  // "createCsrfMiddleware is not a function". This bundling quirk doesn't
  // reproduce in dev mode (Vite serves unbundled ESM there), only in the
  // production build actually deployed to Vercel.
  vite: {
    build: {
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  },
});
