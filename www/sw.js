self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '/index.html',
        '/show.html',
        '/css/passec.css',
        '/img/lock_128.png',
        '/img/lock_196.png',
        '/js/passec.js',
        '/mscp/libs/js/jquery.min.js',
        '/mscp/libs/js/aes.js',
        '/mscp/js/browser.js'
      ]);
    })
  );
});

self.addEventListener('fetch', function(event) {
  let reqClone = event.request.clone()
  event.respondWith(caches.match(event.request).then(function(response) {
    // caches.match() always resolves
    // but in case of success response will have value
    if (response !== undefined) {
      return response;
    } else {
      return fetch(event.request).then(function (response) {
        // response may be used only once
        // we need to save clone to put one copy in cache
        // and serve second one
        let responseClone = response.clone();

        caches.open('v1').then(function (cache) {
          if(event.request.method != "POST"){
            cache.put(event.request, responseClone);
          }
        });
        return response;
      }).catch(async function (e) {
        console.log("Message from service worker:")
        let reqData = await (reqClone.json())
        console.log("Reqdata is ", reqData)
        //return caches.match('/index.html');
        return new Response(JSON.stringify({success: false, error: "Offline", offline: true}))
      });
    }
  }));
});

function loadFromIndexedDB(storeName, id){
  return new Promise(
    function(resolve, reject) {
      var dbRequest = indexedDB.open(storeName);

      dbRequest.onerror = function(event) {
        reject(Error("Error text"));
      };

      dbRequest.onupgradeneeded = function(event) {
        // Objectstore does not exist. Nothing to load
        event.target.transaction.abort();
        reject(Error('Not found'));
      };

      dbRequest.onsuccess = function(event) {
        var database      = event.target.result;
        var transaction   = database.transaction([storeName]);
        var objectStore   = transaction.objectStore(storeName);
        var objectRequest = objectStore.get(id);

        objectRequest.onerror = function(event) {
          reject(Error('Error text'));
        };

        objectRequest.onsuccess = function(event) {
          if (objectRequest.result) resolve(objectRequest.result);
          else reject(Error('object not found'));
        };
      };
    }
  );
}

function saveToIndexedDB(storeName, object){
  return new Promise(
    function(resolve, reject) {
      if (object.id === undefined) reject(Error('object has no id.'));
      var dbRequest = indexedDB.open(storeName);

      dbRequest.onerror = function(event) {
        reject(Error("IndexedDB database error"));
      };

      dbRequest.onupgradeneeded = function(event) {
        var database    = event.target.result;
        var objectStore = database.createObjectStore(storeName, {keyPath: "id"});
      };

      dbRequest.onsuccess = function(event) {
        var database      = event.target.result;
        var transaction   = database.transaction([storeName], 'readwrite');
        var objectStore   = transaction.objectStore(storeName);
        var objectRequest = objectStore.put(object); // Overwrite if exists

        objectRequest.onerror = function(event) {
          reject(Error('Error text'));
        };

        objectRequest.onsuccess = function(event) {
          resolve('Data saved OK');
        };
      };
    }
  );
}
