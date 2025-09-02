// Service Worker to serve GLB models from IndexedDB for Quest compatibility

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Intercept requests to /cached-model/*
  if (url.pathname.startsWith('/cached-model/')) {
    const filename = url.pathname.replace('/cached-model/', '');
    
    event.respondWith(
      handleCachedModelRequest(filename)
    );
  }
});

async function handleCachedModelRequest(filename) {
  try {
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('GLBModelCache', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    
    // Get the model data
    const arrayBuffer = await new Promise((resolve, reject) => {
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(filename);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject(new Error('Model not found in cache'));
        }
      };
    });
    
    // Return the model as a response
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Service worker error serving cached model:', error);
    return new Response('Model not found', { status: 404 });
  }
}

// Install event
self.addEventListener('install', (event) => {
  console.log('GLB Cache Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('GLB Cache Service Worker activated');
  event.waitUntil(self.clients.claim());
});