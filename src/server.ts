import { configManager } from './config';
import { FeedGenerator } from './feed-generator';
import { createApiRoutes, createUiRoutes } from './routes';

function corsPreflightResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export function createServer(port = 3000) {
  const generator = new FeedGenerator(configManager.getConfig(), (cb) =>
    configManager.onConfigChange(cb),
  );

  const apiRoutes = createApiRoutes(generator, configManager);
  const uiRoutes = createUiRoutes(generator, configManager);

  const server = Bun.serve({
    port,
    routes: {
      '/': {
        GET: () => uiRoutes.handleUi(),
        HEAD: () => uiRoutes.handleUi(),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/ui': {
        GET: () => uiRoutes.handleUi(),
        HEAD: () => uiRoutes.handleUi(),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/config': {
        GET: () => uiRoutes.handleGetConfig(),
        PATCH: (req) => uiRoutes.handleUpdateConfig(req),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/config/content-options': {
        PATCH: (req) => uiRoutes.handleUpdateContentOptions(req),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/config/field-behavior': {
        PATCH: (req) => uiRoutes.handleUpdateFieldBehavior(req),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/config/reset': {
        POST: () => uiRoutes.handleResetConfig(),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/regenerate': {
        POST: () => uiRoutes.handleRegenerate(),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/state': {
        GET: () => uiRoutes.handleGetState(),
        HEAD: () => uiRoutes.handleGetState(),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/items': {
        GET: () => apiRoutes.handleGetItems(),
        PATCH: (req) => apiRoutes.handlePatchItemByGuidBody(req),
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/items/:index': {
        PATCH: (req) => {
          const raw = req.params.index;
          if (!/^\d+$/.test(raw)) {
            return new Response('Not Found', { status: 404 });
          }
          return apiRoutes.handlePatchItemByIndex(
            req,
            Number.parseInt(raw, 10),
          );
        },
        OPTIONS: () => corsPreflightResponse(),
      },
      '/api/endpoints': {
        GET: (req) => apiRoutes.handleGetEndpoints(req),
        HEAD: (req) => apiRoutes.handleGetEndpoints(req),
        OPTIONS: () => corsPreflightResponse(),
      },
    },
    async fetch(request) {
      if (request.method === 'OPTIONS') {
        return corsPreflightResponse();
      }

      const url = new URL(request.url);
      const path = url.pathname;
      const config = configManager.getConfig();

      for (const endpoint of config.endpoints) {
        if (path === endpoint.path && endpoint.enabled) {
          return apiRoutes.handleFeed(request, endpoint.format);
        }
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
  .map(
    (e) => `║    ${e.path.padEnd(20)} (${e.format})                         ║`,
  )
  .join('\n')}
╚══════════════════════════════════════════════════════════════╝
`);

  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}
