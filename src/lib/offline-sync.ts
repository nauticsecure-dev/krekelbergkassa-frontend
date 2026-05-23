export interface PendingChange {
  id: string;
  createdAt: string;
  endpoint: string;
  method: string;
  payload: unknown;
  status: 'pending' | 'failed';
  error?: string;
}

const DB_NAME = 'krek-offline';
const STORE = 'changes';
const DB_VERSION = 1;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    fn(store);
    tx.oncomplete = () => resolve(undefined as T);
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueOfflineChange(item: Omit<PendingChange, 'id' | 'createdAt' | 'status'>) {
  const payload: PendingChange = {
    id: uid(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...item,
  };

  await withStore('readwrite', (store) => {
    store.put(payload);
  });

  return payload;
}

export async function listOfflineChanges(): Promise<PendingChange[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as PendingChange[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    req.onerror = () => reject(req.error);
  });
}

export async function removeOfflineChange(id: string) {
  await withStore('readwrite', (store) => {
    store.delete(id);
  });
}

export async function markOfflineFailed(id: string, error: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const value = getReq.result as PendingChange | undefined;
      if (!value) {
        resolve();
        return;
      }
      value.status = 'failed';
      value.error = error;
      store.put(value);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearOfflineChanges() {
  await withStore('readwrite', (store) => {
    store.clear();
  });
}
