import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// A tiny append-safe JSON file store, shared by the wellness and spiritual
// checklists. Extracted rather than copied: the read-modify-write serialisation
// and the "never hand out a shared default object" rule are both easy to get
// subtly wrong, and getting them wrong loses user data silently.
//
// ⚠️ Deploy note: container filesystems are ephemeral. Running on tron needs a
// PersistentVolume mounted at CHECKLIST_DATA_DIR, or history resets on every
// pod restart.

export function dataDir(): string {
  return process.env.CHECKLIST_DATA_DIR ?? join(process.cwd(), ".data");
}

/**
 * Serialises all writes across every store.
 *
 * Two rapid checkbox taps would otherwise both read, both write, and the second
 * write would silently drop the first one's change.
 */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(work, work);
  // Keep the chain alive even if this link rejects.
  writeQueue = result.catch(() => {});
  return result;
}

export class JsonStore<T extends object> {
  /**
   * @param filename    File under the data directory.
   * @param makeEmpty   Must build a NEW object each call. Returning one shared
   *                    constant lets callers mutate the default, so state leaks
   *                    between requests and survives deleting the file.
   * @param isValid     Shape guard, so a corrupted file degrades to empty rather
   *                    than throwing on every page load.
   */
  constructor(
    private readonly filename: string,
    private readonly makeEmpty: () => T,
    private readonly isValid: (parsed: unknown) => boolean,
  ) {}

  private path(): string {
    return join(dataDir(), this.filename);
  }

  async read(): Promise<T> {
    try {
      const raw = await readFile(this.path(), "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return this.isValid(parsed) ? (parsed as T) : this.makeEmpty();
    } catch {
      // Missing on first run, or unparseable.
      return this.makeEmpty();
    }
  }

  /** Reads, applies `mutate`, and writes back — serialised against other writes. */
  async update<R>(mutate: (data: T) => R | Promise<R>): Promise<R> {
    return enqueue(async () => {
      const data = await this.read();
      const result = await mutate(data);
      const path = this.path();
      await mkdir(dirname(path), { recursive: true });
      // Write to a sibling temp file then rename: rename is atomic on the same
      // filesystem, so a crash mid-write can't leave half-written JSON.
      const temp = `${path}.tmp`;
      await writeFile(temp, JSON.stringify(data, null, 2), "utf8");
      await rename(temp, path);
      return result;
    });
  }
}
