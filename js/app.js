const broadcastChannel = new BroadcastChannel("sw");
const clearCache = document.getElementById("clear-cache");

clearCache.addEventListener("click", () => {
	navigator.serviceWorker.controller?.postMessage({
		type: "clear-cache"
	});
});

broadcastChannel.addEventListener("message", e => {
	switch(e.data.type){
		case "clear-cache-done":
			console.log("Cache cleared!");
	}
});