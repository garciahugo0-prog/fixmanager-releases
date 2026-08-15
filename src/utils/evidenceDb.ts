// Gestor de IndexedDB para almacenamiento masivo de evidencias en dispositivos móviles (evitando límites de localStorage)

const DB_NAME = 'fixmanager_evidences_db';
const STORE_NAME = 'evidences';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveEvidenceBlob(id: string, base64: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(base64, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Error al guardar evidencia:', err);
  }
}

export async function getEvidenceBlob(id: string): Promise<string> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || '');
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Error al recuperar evidencia:', err);
    return '';
  }
}

export async function deleteEvidenceBlob(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('[IndexedDB] Error al eliminar evidencia:', err);
  }
}
