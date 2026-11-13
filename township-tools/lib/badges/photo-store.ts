// Check photos taken on the scanner are kept in the phone's IndexedDB (not
// localStorage, which is too small for images) until they upload. Each is
// shrunk to at most 1600px / JPEG first, ~150 KB, so a phone can hold
// hundreds while offline.

const DB = 'tt-scanner';
const STORE = 'check-photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export const putPhoto = (id: string, blob: Blob) => run<void>('readwrite', (s) => s.put(blob, id));
export const getPhoto = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id));
export const deletePhoto = (id: string) => run<void>('readwrite', (s) => s.delete(id));

/** Shrink a camera photo to a readable, small JPEG. */
export async function compressPhoto(file: Blob, maxSide = 1600, quality = 0.72): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read the photo'));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not save the photo'))), 'image/jpeg', quality)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
