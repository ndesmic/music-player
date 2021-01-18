import { collectAsyncIterableAsArray, filterAsyncIterable } from "../libs/iterator-tools.js"
import { IdbStorage } from "../libs/idb-storage.js";

export class WcMusicPlayer extends HTMLElement {
	#handle
	#storage
	#files
	#fileLinks
	static observedAttributes = [];
	constructor() {
		super();
		this.#fileLinks = new WeakMap();
		this.bind(this);
	}
	bind(element) {
		element.attachEvents = element.attachEvents.bind(element);
		element.cacheDom = element.cacheDom.bind(element);
		element.render = element.render.bind(element);
		element.open = element.open.bind(element);
		element.stop = element.stop.bind(element);
		element.play = element.play.bind(element);
		element.selectTrack = element.selectTrack.bind(element);
		element.requestPermission = element.requestPermission.bind(element);
	}
	async connectedCallback() {
		this.#storage = new IdbStorage({ siloName: "file-handles" });
		this.#handle = await this.#storage.get("handle");
		this.render();
		this.cacheDom();
		this.attachEvents();
		if(this.#handle){
			this.getFiles();
		}
	}
	render() {
		this.shadow = this.attachShadow({ mode: "open" });
		this.shadow.innerHTML = `
			<style>
				:host { height: 320px; width: 480px; display: block; background: #efefef; overflow: scroll; position: relative; }
				:host(.inactive) ul { filter: blur(2px); }
			</style>
			<button id="open">Open</button>
			<button id="stop">Stop</button>
			<button id="play">Play</button>
			<h1></h1>
			<ul></ul>
			<audio></audio>
		`;
		this.classList.add("inactive");
	}
	cacheDom() {
		this.dom = {
			title: this.shadowRoot.querySelector("h1"),
			audio: this.shadowRoot.querySelector("audio"),
			list: this.shadowRoot.querySelector("ul"),
			open: this.shadowRoot.querySelector("#open"),
			stop: this.shadowRoot.querySelector("#stop"),
			play: this.shadowRoot.querySelector("#play")
		};
	}
	attachEvents() {
		this.dom.open.addEventListener("click", this.open);
		this.dom.stop.addEventListener("click", this.stop);
		this.dom.play.addEventListener("click", this.play);
		if(this.#handle){
			this.addEventListener("click", this.requestPermission);
		}
	}
	async requestPermission(){
		try{
			await this.#handle.requestPermission({ mode: "read" });
			this.classList.remove("inactive");
			this.removeEventListener("click", this.requestPermission);
		} catch(e){};
	}
	async open(){
		this.#handle = await window.showDirectoryPicker();
		await this.#storage.set("handle", this.#handle);
		this.classList.remove("inactive");
		this.getFiles();
	}
	async getFiles(){
		this.#files = await collectAsyncIterableAsArray(filterAsyncIterable(this.#handle.values(), f => f.kind === "file" && (f.name.endsWith(".mp3") || f.name.endsWith(".m4a"))));
		const docFrag = document.createDocumentFragment();
		this.#files.forEach(f => {
			const li = document.createElement("li");
			li.textContent = f.name;
			docFrag.appendChild(li);
			this.#fileLinks.set(li, f);
		});
		this.dom.list.appendChild(docFrag);
		this.shadowRoot.addEventListener("click", this.selectTrack, false);
	}
	async selectTrack(e){
		const fileHandle = this.#fileLinks.get(e.target);
		if(fileHandle){
			const file = await fileHandle.getFile();
			const url = URL.createObjectURL(file);
			this.dom.audio.src = url;
			this.dom.audio.play();
			this.dom.title.textContent = file.name;
		}
	}
	stop(){
		this.dom.audio.pause();
	}
	play(){
		this.dom.audio.play();
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
}

customElements.define("wc-music-player", WcMusicPlayer);
