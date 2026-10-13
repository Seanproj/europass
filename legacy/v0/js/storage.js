// IndexedDB 저장소 — 방문 기록(visits)과 설정(settings)
// 사진까지 브라우저에 저장하므로 localStorage(5MB 한도) 대신 IndexedDB를 사용
const DB_NAME = 'euro-passport';
const DB_VERSION = 1;

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('visits')) {
        const store = db.createObjectStore('visits', { keyPath: 'id' });
        store.createIndex('cityId', 'cityId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const result = fn(store);
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : result);
    t.onerror = () => reject(t.error);
  }));
}

export const db = {
  allVisits: () => tx('visits', 'readonly', s => s.getAll()),
  putVisit: visit => tx('visits', 'readwrite', s => s.put(visit)),
  deleteVisit: id => tx('visits', 'readwrite', s => s.delete(id)),
  clearVisits: () => tx('visits', 'readwrite', s => s.clear()),
  getSetting: key => tx('settings', 'readonly', s => s.get(key)),
  setSetting: (key, value) => tx('settings', 'readwrite', s => s.put(value, key)),
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 사진을 긴 변 maxSize 픽셀 JPEG로 축소해 dataURL로 반환
export function resizeImage(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없어요')); };
    img.src = url;
  });
}
