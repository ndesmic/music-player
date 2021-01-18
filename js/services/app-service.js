const AppService = (function(){

	const defaults = {
		cacheName : "app-shell",
		precacheUrls : ["/index.html"]
	};

	function create(options){
		let appService = {};
		appService.options = { ...defaults, ...options };
		bind(appService);
		appService.init();
		return appService;
	}

	function bind(appService){
		appService.init = init.bind(appService);
		appService.attachEvents = attachEvents.bind(appService);
		appService.onInstall = onInstall.bind(appService);
		appService.onFetch = onFetch.bind(appService);
		appService.respondFromCache = respondFromCache.bind(appService);
		appService.cacheResponse = cacheResponse.bind(appService);
	}

	function attachEvents(){
		self.addEventListener("install", this.onInstall);
		self.addEventListener("fetch", this.onFetch);
	}

	function onInstall(e){
		e.waitUntil(
			caches.open(this.options.cacheName)
				.then(cache => cache.addAll(this.options.precacheUrls))
		);
	}

	function onFetch(e){
		e.respondWith(
			caches.match(e.request)
				.then(response => this.respondFromCache(e.request, response))
		);
	}

	function respondFromCache(request, response){
		if(response){
			return response;
		}

		var fetchRequest = request.clone();

		return fetch(fetchRequest)
			.then(newResponse => this.cacheResponse(request, newResponse));
	}

	function cacheResponse(request, response){
		if(!response || response.status !== 200 || response.type !== "basic"){
			return response;
		}

		var responseToCache = response.clone();

		caches.open(this.options.cacheName)
			.then(cache => cache.put(request, responseToCache));

		return response;
	}

	function init(){
		this.attachEvents();
	}

	return {
		create
	};

})();
