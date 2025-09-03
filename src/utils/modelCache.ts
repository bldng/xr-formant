// IndexedDB utilities for caching models on Quest and other platforms
// where blob URLs may not work reliably

const DB_NAME = "GLBModelCache";
const DB_VERSION = 1;
const STORE_NAME = "models";

export interface CachedModel {
  filename: string;
  data: ArrayBuffer;
  timestamp: number;
  mimeType: string;
}

// Check if we're running on Quest/Android WebVR where blob URLs might fail
export const isQuestOrAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes("quest") ||
    userAgent.includes("android") ||
    userAgent.includes("oculus")
  );
};

// Open IndexedDB connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "filename" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
};

// Store a model in IndexedDB
export const cacheModel = async (
  filename: string,
  data: ArrayBuffer,
  mimeType: string = "application/octet-stream"
): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const cachedModel: CachedModel = {
      filename,
      data,
      timestamp: Date.now(),
      mimeType,
    };

    const request = store.put(cachedModel);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Retrieve a model from IndexedDB
export const getCachedModel = async (
  filename: string
): Promise<ArrayBuffer | null> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(filename);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data);
      } else {
        resolve(null);
      }
    };
  });
};

// Check if a model exists in cache
export const isModelCached = async (filename: string): Promise<boolean> => {
  try {
    const data = await getCachedModel(filename);
    return data !== null;
  } catch (error) {
    console.error("Error checking model cache:", error);
    return false;
  }
};

// Delete a model from cache
export const deleteCachedModel = async (filename: string): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(filename);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// List all cached models
export const listCachedModels = async (): Promise<string[]> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
};

// Clear all cached models
export const clearCache = async (): Promise<void> => {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Create a service-worker compatible URL for cached models
export const getCachedModelUrl = (filename: string): string => {
  return `/cached-model/${encodeURIComponent(filename)}`;
};

// Global debug state for visual feedback on Quest
let questDebugInfo = "";
export const getQuestDebugInfo = () => questDebugInfo;
export const setQuestDebugInfo = (info: string) => {
  questDebugInfo = info;
  // Dispatch custom event to update UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("questDebugUpdate", { detail: info }));
  }
};

// Process file and return appropriate URL based on platform
export const processModelFile = async (
  file: File
): Promise<{ url: string; filename: string }> => {
  const filename = file.name;

  if (isQuestOrAndroid()) {
    setQuestDebugInfo(`Quest: Trying OPFS...`);

    try {
      // Check if OPFS is available
      if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) {
        throw new Error('OPFS not supported');
      }

      const arrayBuffer = await file.arrayBuffer();
      setQuestDebugInfo(`Quest: Got file data (${arrayBuffer.byteLength} bytes)`);

      // Store in OPFS
      const opfsRoot = await navigator.storage.getDirectory();
      const fileHandle = await opfsRoot.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(arrayBuffer);
      await writable.close();
      
      setQuestDebugInfo(`Quest: Stored in OPFS`);

      // Get file from OPFS (this returns a real File object, not blob)
      const opfsFile = await fileHandle.getFile();
      
      // Try to use the file directly without createObjectURL
      setQuestDebugInfo(`Quest: OPFS file ready, size: ${opfsFile.size}`);
      
      // Return the file's stream as a data URL
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(opfsFile);
      });
      
      setQuestDebugInfo(`Quest: Data URL from OPFS created`);
      return { url: dataUrl, filename };
      
    } catch (error) {
      setQuestDebugInfo(`Quest: OPFS failed - ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  } else {
    // Use traditional blob URL for desktop
    return {
      url: URL.createObjectURL(file),
      filename,
    };
  }
};
