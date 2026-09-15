// Tout est stocké localement dans le navigateur : aucune donnée n'est envoyée
// à un serveur. Les listes (unités, factures) vont dans localStorage ; les
// fichiers joints (PDF/scans) vont dans IndexedDB, plus adapté aux fichiers
// binaires potentiellement volumineux.

const DB_NAME = "pmu-factures-files";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openFilesDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(id, file) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ blob: file, name: file.name, type: file.type }, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(id) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(id) {
  const db = await openFilesDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const UNITS_KEY = "pmu_units";
const INVOICES_KEY = "pmu_invoices";

export function loadUnits() {
  try {
    return JSON.parse(localStorage.getItem(UNITS_KEY)) || [];
  } catch {
    return [];
  }
}
export function saveUnits(units) {
  localStorage.setItem(UNITS_KEY, JSON.stringify(units));
}

export function loadInvoices() {
  try {
    return JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
  } catch {
    return [];
  }
}
export function saveInvoices(invoices) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}
