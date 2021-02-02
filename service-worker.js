const cacheName = "app-shell";
const precacheUrls = ["/index.html"];
const broadcastChannel = new BroadcastChannel("sw");

function attachEvents() {
	self.addEventListener("install", onInstall);
	self.addEventListener("fetch", onFetch);
	self.addEventListener("message", onMessage);
}

function onInstall(e) {
	e.waitUntil(
		caches.open(cacheName)
			.then(cache => cache.addAll(precacheUrls)
	));
}

function onFetch(e) {
	e.respondWith(
		fetch(e.request)
			.then(response => cacheResponse(e.request, response))
			.catch(() =>
				caches.match(e.request))
	);
}

function onMessage(e){
	async function handleMessage(){
		switch (e.data.type) {
			case "clear-cache":
				await caches.delete(cacheName);
				broadcastChannel.postMessage({ type: "clear-cache-done" });
		}
	}
	e.waitUntil(handleMessage());
}

function respondFromCache(request, response) {
	if (response) {
		return response;
	}
	var fetchRequest = request.clone();
	return fetch(fetchRequest)
		.then(newResponse => cacheResponse(request, newResponse));
}

function cacheResponse(request, response) {
	if (!response || response.status !== 200 || response.type !== "basic") {
		return response;
	}
	const responseToCache = response.clone();
	caches.open(cacheName)
		.then(cache => cache.put(request, responseToCache));
	return response;
}

attachEvents();