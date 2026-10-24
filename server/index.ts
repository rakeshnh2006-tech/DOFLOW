import type { IncomingMessage, ServerResponse } from 'node:http';
import { initializeDatabase } from './db/database.js';
import { CoinEngine } from './engine/coinEngine.js';
import { handleCoinsApiRequest } from './api/router.js';

let sharedDatabase: ReturnType<typeof initializeDatabase> | null = null;
let sharedEngine: CoinEngine | null = null;

export function getSharedCoinEngine(): CoinEngine {
  if (!sharedEngine) {
    sharedDatabase = initializeDatabase();
    sharedEngine = new CoinEngine(sharedDatabase);
  }
  return sharedEngine;
}

/**
 * Connect/Express middleware for handling /api/coins requests in Vite dev server or Node server.
 */
export function createCoinsMiddleware(customEngine?: CoinEngine) {
  const engine = customEngine || getSharedCoinEngine();

  return async (req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> => {
    const url = req.url || '';
    const [pathname] = url.split('?');

    if (
      !pathname.startsWith('/api/coins') &&
      !pathname.startsWith('/api/perks') &&
      !pathname.startsWith('/api/partner-offers') &&
      !pathname.startsWith('/api/admin')
    ) {
      return next();
    }

    try {
      let body: Record<string, unknown> | undefined = undefined;

      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        if (rawBody.trim().length > 0) {
          try {
            body = JSON.parse(rawBody);
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
            return;
          }
        }
      }

      const headers = req.headers as Record<string, string | string[] | undefined>;
      const response = await handleCoinsApiRequest(
        req.method || 'GET',
        pathname,
        headers,
        body,
        engine
      );

      res.statusCode = response.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(response.body));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: message }));
    }
  };
}

/**
 * Vite plugin exposing the coins backend in dev mode.
 */
export function doflowCoinsVitePlugin() {
  return {
    name: 'doflow-coins-api-plugin',
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use(createCoinsMiddleware());
    },
  };
}
