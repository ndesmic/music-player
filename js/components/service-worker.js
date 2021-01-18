customElements.define("service-worker",
class extends HTMLElement {
	static get observedAttributes() {
		return ["url", "scope"];
	}
	constructor(){
		super();
		this.attrs = {};
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
		this.attrs[name] = newValue;
	}
	get url(){
		return this.attrs.url || "service-worker.js";
	}
	set url(value){
		this.attrs.url = value;
	}
	get scope(){
		return this.attrs.scope || "./";
	}
	set scope(value){
		this.attrs.scope = value;
	}
});
