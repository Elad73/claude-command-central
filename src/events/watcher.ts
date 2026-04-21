import { FeedReader } from './feed.js';
import type { DashboardEvent } from './types.js';

export interface FeedSource {
  path: string;
  project: string;
}

export type EventListener = (event: DashboardEvent) => void;
export type ErrorListener = (error: unknown, path: string) => void;
export type Unsubscribe = () => void;

export interface MultiFeedWatcherOptions {
  /** Poll interval in ms. Defaults to ~6 Hz. */
  pollMs?: number;
}

/**
 * Polls N JSONL feeds on a shared interval and dispatches validated events
 * to subscribers. Pure polling — reliable across WSL and network mounts.
 * Sources can be added/removed at runtime.
 */
export class MultiFeedWatcher {
  private readonly readers = new Map<string, FeedReader>();
  private readonly pollMs: number;
  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private eventListeners: EventListener[] = [];
  private errorListeners: ErrorListener[] = [];

  constructor(sources: FeedSource[] = [], options: MultiFeedWatcherOptions = {}) {
    this.pollMs = options.pollMs ?? 166;
    for (const source of sources) this.addSource(source);
  }

  addSource(source: FeedSource): void {
    if (this.readers.has(source.project)) return;
    this.readers.set(
      source.project,
      new FeedReader(source.path, { project: source.project }),
    );
  }

  removeSource(project: string): void {
    this.readers.delete(project);
  }

  get sources(): readonly FeedSource[] {
    return [...this.readers.values()].map((r) => ({ path: r.path, project: r.project }));
  }

  onEvent(fn: EventListener): Unsubscribe {
    this.eventListeners.push(fn);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== fn);
    };
  }

  onError(fn: ErrorListener): Unsubscribe {
    this.errorListeners.push(fn);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== fn);
    };
  }

  async start(): Promise<void> {
    if (this.timer) return;
    await this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Perform one poll cycle across all readers. Exposed for tests. */
  async tick(): Promise<void> {
    if (this.polling) return;
    this.polling = true;
    try {
      for (const reader of this.readers.values()) {
        try {
          const events = await reader.poll();
          for (const event of events) {
            for (const listener of this.eventListeners) listener(event);
          }
        } catch (err) {
          for (const listener of this.errorListeners) listener(err, reader.path);
        }
      }
    } finally {
      this.polling = false;
    }
  }
}
