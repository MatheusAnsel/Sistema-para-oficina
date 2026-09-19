import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Armazenamento minimo (chave/valor + lista). Usa Upstash Redis quando as
 * variaveis estao definidas; senao grava em .data/db.json (somente dev local).
 */
export interface KV {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  lpush(key: string, value: string): Promise<void>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

class UpstashKV implements KV {
  constructor(private url: string, private token: string) {}

  private async cmd<T>(...args: (string | number)[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const data = (await res.json()) as { result: T; error?: string };
    if (data.error) throw new Error(data.error);
    return data.result;
  }

  async get<T>(key: string) {
    const raw = await this.cmd<string | null>("GET", key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async set(key: string, value: unknown) {
    await this.cmd("SET", key, JSON.stringify(value));
  }
  async lpush(key: string, value: string) {
    await this.cmd("LPUSH", key, value);
  }
  async lrange(key: string, start: number, stop: number) {
    return this.cmd<string[]>("LRANGE", key, start, stop);
  }
}

type Db = { kv: Record<string, unknown>; lists: Record<string, string[]> };

class FileKV implements KV {
  private file = path.join(process.cwd(), ".data", "db.json");
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<Db> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Db;
    } catch {
      return { kv: {}, lists: {} };
    }
  }

  /** serializa as escritas para nao corromper o arquivo */
  private mutate<T>(fn: (db: Db) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const db = await this.read();
      const out = fn(db);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      await fs.writeFile(this.file, JSON.stringify(db, null, 2));
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async get<T>(key: string) {
    await this.queue;
    return ((await this.read()).kv[key] as T | undefined) ?? null;
  }
  async set(key: string, value: unknown) {
    await this.mutate((db) => void (db.kv[key] = value));
  }
  async lpush(key: string, value: string) {
    await this.mutate((db) => void (db.lists[key] = [value, ...(db.lists[key] ?? [])]));
  }
  async lrange(key: string, start: number, stop: number) {
    await this.queue;
    const list = (await this.read()).lists[key] ?? [];
    return list.slice(start, stop === -1 ? undefined : stop + 1);
  }
}

let instance: KV | undefined;

export function kv(): KV {
  if (!instance) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    instance = url && token ? new UpstashKV(url, token) : new FileKV();
  }
  return instance;
}
