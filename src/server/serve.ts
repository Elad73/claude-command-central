import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { MultiFeedWatcher, type FeedSource } from '../events/watcher.js';
import { loadRegistry } from '../config/registry.js';
import type { DashboardEvent } from '../events/types.js';
import { createStateStore } from './state-store.js';
import { pruneStale } from '../state/dashboard-reducer.js';

const STALE_TTL_MS = 60_000;
// Crash backstop for working agents whose session died without a `Stop` event.
// Long enough not to evict a genuinely long-running tool call; short enough
// that a truly dead session clears. Clean session ends are handled instantly
// by the flow→done cascade in the reducer, so this only catches kills/crashes.
const ACTIVE_STALE_TTL_MS = 30 * 60_000;

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ServeOptions {
  port: number;
  host: string;
  sources: FeedSource[];
  /** Absolute path to the built web app directory (containing index.html). */
  webRoot?: string;
  /**
   * When true, poll the CCC project registry periodically and sync the watcher:
   * new `ccc init`s in other projects appear without restart, removed projects are dropped.
   * Typically enabled when the CLI defaulted its source list to the registry.
   */
  autoReload?: boolean;
  reloadIntervalMs?: number;
}

export async function createServer(options: ServeOptions): Promise<{
  fastify: FastifyInstance;
  watcher: MultiFeedWatcher;
  start: () => Promise<string>;
  stop: () => Promise<void>;
}> {
  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  await fastify.register(fastifyCors, { origin: true });

  const watcher = new MultiFeedWatcher(options.sources, { pollMs: 150 });
  const sseClients = new Set<(event: DashboardEvent) => void>();
  const store = createStateStore();
  watcher.onEvent((event) => {
    // Apply to the store BEFORE fanning out to SSE clients so a client hitting
    // /api/snapshot mid-burst sees a state at least as fresh as what it will
    // receive over SSE. The reducer is idempotent for agent/flow updates, and
    // the log buffer is bounded so any rare duplication is harmless.
    store.apply(event);
    for (const send of sseClients) send(event);
  });

  // /events — Server-Sent Events stream of validated dashboard events
  fastify.get('/events', async (request: FastifyRequest, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(': connected\n\n');

    const send = (event: DashboardEvent) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        // Client gone — cleanup handled via 'close'
      }
    };
    sseClients.add(send);

    const keepalive = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        /* noop */
      }
    }, 15_000);

    request.raw.on('close', () => {
      clearInterval(keepalive);
      sseClients.delete(send);
    });
  });

  // /api/projects — current project registry for the UI
  fastify.get('/api/projects', async () => {
    const registry = await loadRegistry();
    return {
      projects: Object.values(registry.projects),
      current: options.sources.map((s) => s.project),
    };
  });

  // /api/sources — what this server is actually streaming (reflects hot-reload additions)
  fastify.get('/api/sources', async () => ({
    sources: watcher.sources,
  }));

  // /api/snapshot — current dashboard state, with stale agents (done/idle past
  // TTL) pruned view-only for hydration. Lets a refreshed browser pick up the
  // live office without waiting on the next event.
  fastify.get('/api/snapshot', async () =>
    pruneStale(store.get(), Date.now(), STALE_TTL_MS, ACTIVE_STALE_TTL_MS),
  );

  // Static web app (only if webRoot is provided and exists)
  const webRoot = options.webRoot ?? join(__dirname, 'web');
  try {
    await fs.access(join(webRoot, 'index.html'));
    await fastify.register(fastifyStatic, {
      root: webRoot,
      prefix: '/',
    });
  } catch {
    // No built web app present — expose a tiny placeholder so `/` still responds
    fastify.get('/', async () => {
      return {
        message: 'CCC server is running, but no bundled web app was found.',
        hint: 'Run `npm run build:web` in the ccc repo, or run the Vite dev server on port 5173.',
        webRootLookedAt: webRoot,
      };
    });
  }

  let reloadTimer: NodeJS.Timeout | null = null;

  const syncRegistry = async (): Promise<void> => {
    const registry = await loadRegistry();
    const wanted = new Map<string, string>(); // slug → feed path
    for (const entry of Object.values(registry.projects)) {
      wanted.set(entry.slug, entry.feed);
    }
    const current = new Set(watcher.sources.map((s) => s.project));

    for (const [slug, feed] of wanted) {
      if (!current.has(slug)) {
        watcher.addSource({ path: feed, project: slug });
      }
    }
    for (const slug of current) {
      if (!wanted.has(slug)) watcher.removeSource(slug);
    }
  };

  return {
    fastify,
    watcher,
    start: async () => {
      await watcher.start();
      const addr = await fastify.listen({ port: options.port, host: options.host });
      // SECURITY: the server has no authentication. It streams the user's
      // entire Claude Code session (prompts, file paths, bash commands) over
      // SSE to anyone who can reach the bound address. Warn loudly if the
      // operator binds to anything other than loopback.
      const loopback = new Set(['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1']);
      if (!loopback.has(options.host)) {
        console.warn(
          `\n  ⚠  ccc serve is bound to ${options.host} (not loopback).\n` +
            `     There is NO authentication on /events or /api/*.\n` +
            `     Anyone on this network can read your Claude Code session.\n` +
            `     Re-run with --host 127.0.0.1 unless you truly need LAN access.\n`,
        );
      }
      if (options.autoReload) {
        const interval = options.reloadIntervalMs ?? 5000;
        reloadTimer = setInterval(() => {
          void syncRegistry().catch(() => {
            /* transient registry read errors are non-fatal */
          });
        }, interval);
      }
      return addr;
    },
    stop: async () => {
      if (reloadTimer) {
        clearInterval(reloadTimer);
        reloadTimer = null;
      }
      watcher.stop();
      await fastify.close();
    },
  };
}
