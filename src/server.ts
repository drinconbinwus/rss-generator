import type { ContentSourceFormat } from './types';
import { configManager } from './config';
import { FeedGenerator } from './feed-generator';
import { formatFeed } from './formatters';
import { createApiRoutes, createUiRoutes } from './routes';

export function createServer(port = 3000) {
  const generator = new FeedGenerator(
    configManager.getConfig(),
    (cb) => configManager.onConfigChange(cb)
  );

  const apiRoutes = createApiRoutes(generator, configManager);
  const uiRoutes = createUiRoutes(generator, configManager);

  const server = Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }

      // Feed endpoints
      const config = configManager.getConfig();
      for (const endpoint of config.endpoints) {
        if (path === endpoint.path && endpoint.enabled) {
          return apiRoutes.handleFeed(request, endpoint.format);
        }
      }

      // API routes
      if (path === '/api/config' && request.method === 'GET') {
        return uiRoutes.handleGetConfig();
      }
      if (path === '/api/config' && request.method === 'PATCH') {
        return uiRoutes.handleUpdateConfig(request);
      }
      if (path === '/api/config/content-options' && request.method === 'PATCH') {
        return uiRoutes.handleUpdateContentOptions(request);
      }
      if (path === '/api/config/field-behavior' && request.method === 'PATCH') {
        return uiRoutes.handleUpdateFieldBehavior(request);
      }
      if (path === '/api/config/reset' && request.method === 'POST') {
        return uiRoutes.handleResetConfig();
      }
      if (path === '/api/regenerate' && request.method === 'POST') {
        return uiRoutes.handleRegenerate();
      }
      if (path === '/api/state') {
        return uiRoutes.handleGetState();
      }
      if (path === '/api/items') {
        return apiRoutes.handleGetItems();
      }
      if (path === '/api/endpoints') {
        return apiRoutes.handleGetEndpoints(request);
      }

      // UI
      if (path === '/' || path === '/ui') {
        return uiRoutes.handleUi();
      }

      return new Response('Not Found', { status: 404 });
    },
  });

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🚀 RSS Feed Generator                     ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${port}                     ║
║  UI Dashboard:       http://localhost:${port}/ui                 ║
║                                                              ║
║  Available endpoints:                                        ║
${configManager
  .getConfig()
  .endpoints.filter((e) => e.enabled)
  .map((e) => `║    ${e.path.padEnd(20)} (${e.format})                         ║`)
  .join('\n')}
╚══════════════════════════════════════════════════════════════╝
`);

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}