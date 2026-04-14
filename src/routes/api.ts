import type { FeedGenerator } from '../feed-generator';
import type { ConfigManager } from '../config';
import type { ContentSourceFormat, FeedConfig, ItemPatch } from '../types';
import { formatFeed } from '../formatters';

/** Skip gzip on tiny bodies — overhead often outweighs savings. */
const MIN_BYTES_FOR_GZIP = 256;

function feedResponse(
  body: string,
  contentType: string,
  request: Request,
): Response {
  const headers: Record<string, string> = {
    'Content-Type': `${contentType}; charset=utf-8`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
  };

  const enc = request.headers.get('Accept-Encoding') ?? '';
  const wantGzip =
    body.length >= MIN_BYTES_FOR_GZIP && /\bgzip\b/i.test(enc);

  if (wantGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    const encoded = new TextEncoder().encode(body);
    const uncompressed = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    });
    const compressed = uncompressed.pipeThrough(
      new CompressionStream('gzip') as TransformStream<
        Uint8Array,
        Uint8Array
      >,
    );
    return new Response(compressed, { headers });
  }

  return new Response(body, { headers });
}

export function createApiRoutes(
  generator: FeedGenerator,
  configManager: ConfigManager,
) {
  return {
    handleFeed(
      request: Request,
      format: ContentSourceFormat,
    ): Response {
      const url = new URL(request.url);
      const source = url.searchParams.get('source') || 'default';
      const items = generator.getItems(source);
      const config = configManager.getConfig();
      const content = formatFeed(items, config, format);

      const contentType =
        format === 'JSON' ? 'application/json' : 'application/xml';

      return feedResponse(content, contentType, request);
    },

    async handleGetConfig(): Promise<Response> {
      return Response.json(configManager.getConfig());
    },

    async handleUpdateConfig(request: Request): Promise<Response> {
      try {
        const updates = (await request.json()) as Partial<FeedConfig>;
        configManager.updateConfig(updates);
        return Response.json({
          success: true,
          config: configManager.getConfig(),
        });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 },
        );
      }
    },

    async handleUpdateContentOptions(request: Request): Promise<Response> {
      try {
        const updates = (await request.json()) as Partial<
          FeedConfig['contentOptions']
        >;
        configManager.updateContentOptions(updates);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 },
        );
      }
    },

    async handleUpdateFieldBehavior(request: Request): Promise<Response> {
      try {
        const updates = (await request.json()) as Partial<
          FeedConfig['fieldBehavior']
        >;
        configManager.updateFieldBehavior(updates);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 400 },
        );
      }
    },

    async handleRegenerate(): Promise<Response> {
      generator.regenerate();
      return Response.json({ success: true, state: generator.getState() });
    },

    async handleGetState(): Promise<Response> {
      return Response.json(generator.getState());
    },

    async handleGetItems(): Promise<Response> {
      return Response.json(generator.getItems());
    },

    async handlePatchItemByIndex(
      request: Request,
      index: number,
    ): Promise<Response> {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(body, 'guid')) {
          return Response.json(
            { error: 'Cannot change guid; omit guid from body' },
            { status: 400 },
          );
        }
        const result = generator.patchItemByIndex(index, body as ItemPatch);
        if (!result.ok) {
          const status = result.error === 'Item not found' ? 404 : 400;
          return Response.json({ error: result.error }, { status });
        }
        return Response.json({ success: true, item: result.item });
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    },

    async handlePatchItemByGuidBody(request: Request): Promise<Response> {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const guid = body.guid;
        if (typeof guid !== 'string' || guid.length === 0) {
          return Response.json(
            { error: 'Body must include a non-empty guid string' },
            { status: 400 },
          );
        }
        const { guid: _omit, ...patch } = body;
        if (Object.prototype.hasOwnProperty.call(patch, 'guid')) {
          return Response.json(
            { error: 'Cannot change guid' },
            { status: 400 },
          );
        }
        const result = generator.patchItemByGuid(guid, patch as ItemPatch);
        if (!result.ok) {
          const status = result.error === 'Item not found' ? 404 : 400;
          return Response.json({ error: result.error }, { status });
        }
        return Response.json({ success: true, item: result.item });
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    },

    async handleResetConfig(): Promise<Response> {
      configManager.reset();
      return Response.json({ success: true });
    },

    async handleGetEndpoints(request: Request): Promise<Response> {
      const config = configManager.getConfig();
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;
      const endpoints = config.endpoints.map((ep) => ({
        ...ep,
        url: `${baseUrl}${ep.path}`,
      }));
      return Response.json({ endpoints });
    },
  };
}
