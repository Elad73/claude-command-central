import { promises as fs } from 'fs';
import { parseEventLine } from './schema.js';
import type { DashboardEvent } from './types.js';

const PREFIX_SAMPLE_SIZE = 64;

export interface FeedReaderOptions {
  /** Project slug to stamp on emitted events when the event itself has no project field. */
  project: string;
}

/**
 * Tails a single JSONL feed file.
 * - Missing files are treated as empty (not an error).
 * - File replacement is detected by comparing a cached prefix sample against the
 *   current file content — robust across inode reuse and zero-resolution timestamps
 *   (WSL tmpfs, some network mounts).
 * - Partial trailing lines are buffered until a newline arrives.
 * - Malformed JSON is silently skipped.
 */
export class FeedReader {
  readonly path: string;
  readonly project: string;
  private offset = 0;
  private partial = '';
  private seenPrefix: Buffer | null = null;

  constructor(path: string, options: FeedReaderOptions) {
    this.path = path;
    this.project = options.project;
  }

  async poll(): Promise<DashboardEvent[]> {
    let data: Buffer;
    try {
      data = await fs.readFile(this.path);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.reset();
        return [];
      }
      throw err;
    }

    const shrunk = data.length < this.offset;
    const sampleLen = Math.min(PREFIX_SAMPLE_SIZE, data.length, this.offset);
    const prefixChanged =
      this.seenPrefix !== null &&
      sampleLen > 0 &&
      !data.subarray(0, sampleLen).equals(this.seenPrefix.subarray(0, sampleLen));

    if (shrunk || prefixChanged) {
      this.offset = 0;
      this.partial = '';
    }

    this.seenPrefix = Buffer.from(
      data.subarray(0, Math.min(PREFIX_SAMPLE_SIZE, data.length)),
    );

    if (data.length === this.offset) return [];

    const chunk = data.subarray(this.offset).toString('utf8');
    this.offset = data.length;

    const combined = this.partial + chunk;
    const lines = combined.split('\n');
    this.partial = lines.pop() ?? '';

    const events: DashboardEvent[] = [];
    for (const line of lines) {
      const event = parseEventLine(line);
      if (event) {
        events.push(event.project ? event : { ...event, project: this.project });
      }
    }
    return events;
  }

  /** Reset the read position. Useful for tests. */
  reset(): void {
    this.offset = 0;
    this.partial = '';
    this.seenPrefix = null;
  }
}
