import { collectAsyncIterableAsArray, filterAsyncIterable } from "../libs/iterator-tools.js"
import { IdbStorage } from "../libs/idb-storage.js";

export class WcMusicPlayer extends HTMLElement {
	#handle
	#storage
	#files
	#fileLinks
	#isPlaying = false;
	#isReady = false;
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
		element.togglePlay = element.togglePlay.bind(element);
		element.togglePlayClick = element.togglePlayClick.bind(element);
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
				:host { height: 320px; width: 480px; display: grid; grid-template-columns: 1fr; grid-template-rows: 2rem 1fr 2rem; background: #efefef; grid-template-areas: "title" "track-list" "controls"; overflow: hidden; }
				:host(:not([ready])) #track-list { filter: blur(2px); }
				:host(:not([ready])) #toggle-play { display: none; }
				#title { grid-area: title; margin: 0; white-space: nowrap; text-overflow: ellipsis; }
				#track-list-container { grid-area: track-list; }
				#controls { grid-area: controls; }
				.overflow { overflow-y: auto; }
			</style>
			<h1 id="title"></h1>
			<div class="overflow" id="track-list-container">
				<ul id="track-list"></ul>
			</div>
			<div id="controls">
				<button id="open">Open</button>
				<button id="toggle-play" class="hidden">Play</button>
				<audio></audio>
			</div>
		`;
	}
	cacheDom() {
		this.dom = {
			title: this.shadowRoot.querySelector("h1"),
			audio: this.shadowRoot.querySelector("audio"),
			list: this.shadowRoot.querySelector("ul"),
			open: this.shadowRoot.querySelector("#open"),
			togglePlay: this.shadowRoot.querySelector("#toggle-play")
		};
	}
	attachEvents() {
		this.dom.open.addEventListener("click", this.open);
		this.dom.togglePlay.addEventListener("click", this.togglePlayClick);
		if(this.#handle){
			this.addEventListener("click", this.requestPermission);
		}
	}
	async requestPermission(){
		try{
			await this.#handle.requestPermission({ mode: "read" });
			this.isReady = true;
			this.removeEventListener("click", this.requestPermission);
		} catch(e){};
	}
	async open(){
		this.#handle = await window.showDirectoryPicker();
		await this.#storage.set("handle", this.#handle);
		this.isReady = true;
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
			this.dom.title.textContent = file.name;
			this.togglePlay(true);
		}
	}
	stop(){
		this.dom.audio.pause();
	}
	togglePlayClick(e){
		this.togglePlay();
	}
	togglePlay(value){
		const shouldPlay = value ?? !this.#isPlaying;
		if(shouldPlay){
			this.dom.audio.play();
			this.#isPlaying = true;
			this.dom.togglePlay.textContent = "Stop";
		} else {
			this.dom.audio.pause();
			this.#isPlaying = false;
			this.dom.togglePlay.textContent = "Play";
		}
	}
	attributeChangedCallback(name, oldValue, newValue) {
		this[name] = newValue;
	}
	set isReady(value){
		if(value){
			this.#isReady = true;
			this.setAttribute("ready", "");
		} else {
			this.#isReady = false;
			this.removeAttribute("ready");
		}
	}
	get isReady(){
		return this.#isReady;
	}
}

customElements.define("wc-music-player", WcMusicPlayer);
