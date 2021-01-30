class WcServiceWorker extends HTMLElement {
	#scope = "./";
	#url = "service-worker.js";
	static observedAttributes = ["url", "scope"];
	connectedCallback(){
		this.installServiceWorker();
	}
	async installServiceWorker(){
		if("serviceWorker" in navigator){
			try {
				const serviceWorker = await navigator.serviceWorker.register(this.url, {scope: this.scope});
				this.serviceWorkerInstalled(serviceWorker);
			}catch(ex){
				this.serviceWorkerInstallFailed(ex);
			}
		}
	}

	serviceWorkerInstalled(registration){
		console.log("App Service registration successful with scope:", registration.scope);
	}

	serviceWorkerInstallFailed(error){
		console.error("App Service failed to install", error);
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
	get url(){
		return this.#url;
	}
	set url(value){
		this.#url = value;
	}
	get scope(){
		return this.#scope;
	}
	set scope(value){
		this.#scope = value;
	}
}
customElements.define("wc-service-worker", WcServiceWorker);
