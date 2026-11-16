import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const anthropicKey = (env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY || '').trim();

  // GitHub Pages project site: /edvidura-lti-hello/3d-lab-studio/
  const base = (process.env.VITE_BASE || '/').trim() || '/';

  return {
    root: '.',
    base,
    // Avoid import.meta.env.* define (Vite can overwrite those). Use a plain flag.
    // Anthropic proxy only works in `vite dev` — static Pages builds stay heuristic-only.
    define: {
      __EDV_ANTHROPIC_PROXY__: JSON.stringify(
        mode !== 'production' && anthropicKey ? '1' : ''
      ),
    },
    server: {
      port: 5177,
      host: true,
      proxy: anthropicKey
        ? {
            '/anthropic-api': {
              target: 'https://api.anthropic.com',
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/anthropic-api/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  // Inject server-side key; strip browser CORS markers so Anthropic
                  // does not treat this as a dangerous direct browser call.
                  proxyReq.setHeader('x-api-key', anthropicKey);
                  proxyReq.setHeader('anthropic-version', '2023-06-01');
                  proxyReq.removeHeader('origin');
                  proxyReq.removeHeader('referer');
                  proxyReq.removeHeader('sec-fetch-mode');
                  proxyReq.removeHeader('sec-fetch-site');
                  proxyReq.removeHeader('sec-fetch-dest');
                  proxyReq.removeHeader('sec-fetch-user');
                });
              },
            },
          }
        : undefined,
    },
  };
});
