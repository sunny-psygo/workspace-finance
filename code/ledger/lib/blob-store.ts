import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredBlob = {
  storageKey: string;
  byteSize: number;
};

export type BlobStore = {
  put(keyPrefix: string, fileName: string, bytes: Buffer): Promise<StoredBlob>;
  get(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, "_").slice(0, 120);
}

function resolveLocalPath(storageKey: string, blobRoot: string) {
  if (path.isAbsolute(storageKey)) return storageKey;
  // 旧数据：相对仓库根的 data/... 路径
  if (storageKey.startsWith("data/")) {
    return path.join(process.cwd(), storageKey);
  }
  // 新数据：BlobStore 键，落在 data/blobs/
  return path.join(blobRoot, storageKey);
}

export function createLocalBlobStore(rootDir = path.join(process.cwd(), "data", "blobs")): BlobStore {
  return {
    async put(keyPrefix, fileName, bytes) {
      const prefix = keyPrefix.replace(/^\/+|\/+$/g, "");
      const storedName = `${Date.now()}-${safeFileName(fileName)}`;
      const storageKey = `${prefix}/${storedName}`;
      const absolute = path.join(rootDir, storageKey);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFile(absolute, bytes);
      return { storageKey, byteSize: bytes.length };
    },
    async get(storageKey) {
      return readFile(resolveLocalPath(storageKey, rootDir));
    },
    async exists(storageKey) {
      try {
        await access(resolveLocalPath(storageKey, rootDir));
        return true;
      } catch {
        return false;
      }
    },
  };
}

let store: BlobStore = createLocalBlobStore();

export function getBlobStore() {
  return store;
}

/** 测试或未来换 OSS 时可替换。 */
export function setBlobStore(next: BlobStore) {
  store = next;
}
