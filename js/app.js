const broadcastChannel = new BroadcastChannel("sw");
const musicPlayer = document.querySelector("wc-music-player");

broadcastChannel.addEventListener("message", e => {
	switch(e.data.type){
		case "clear-cache-done":
			console.log("Cache cleared!");
	}
});

if ("launchQueue" in window) {
	launchQueue.setConsumer(async launchParams => {
		if (launchParams.files.length) {
			musicPlayer.loaded.then(() => musicPlayer.addFiles(launchParams.files, true));
		}
	});
}