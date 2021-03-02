import { collectAsyncIterableAsArray, filterAsyncIterable } from "../libs/iterator-tools.js"
import { IdbStorage } from "../libs/idb-storage.js";
import { getId3 } from "../libs/mp3-util.js";
import { readAsArrayBuffer } from "../libs/file-util.js";

export class WcMusicPlayer extends HTMLElement {
	#handle
	#storage
	#files = [];
	#fileLinks
	#isPlaying = false;
	#isReady;
	#setLoaded;
	static observedAttributes = [];
	constructor() {
		super();
		this.#fileLinks = new WeakMap();
		this.bind(this);
		this.loaded = new Promise((res,rej) => this.#setLoaded = res);
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
		element.addFiles = element.addFiles.bind(element);
		element.playFile = element.playFile.bind(element);
		element.updateDisplay = element.updateDisplay.bind(element);
	}
	async connectedCallback() {
		this.#storage = new IdbStorage({ siloName: "file-handles" });
		this.#handle = await this.#storage.get("handle");
		this.render();
		this.cacheDom();
		this.attachEvents();
		this.#setLoaded();
	}
	render() {
		this.shadow = this.attachShadow({ mode: "open" });
		this.shadow.innerHTML = `
			<link rel="stylesheet" href="css/system.css" />
			<link rel="stylesheet" href="css/neu.css" />
			<style>
				:host { 
					height: 320px; 
					width: 480px; 
					display: grid; 
					grid-template-columns: 1fr 640px;
					grid-template-rows: auto 1fr auto; 
					background: #efefef; 
					grid-template-areas: "title info" "track-list info" "controls controls"; 
					overflow: hidden; 
				}
				:host(:not([ready])) #track-list { filter: blur(2px); }
				:host(:not([ready])) #toggle-play { display: none; }
				#title { grid-area: title; margin: 0; white-space: nowrap; text-overflow: ellipsis; margin: 1rem 0; padding-left: 1rem; }
				#track-list-container { grid-area: track-list; padding-left: 1rem; }
				#instructions { grid-area: track-list; display: flex; justify-content: center; align-items: center; }
				#controls { grid-area: controls; background: var(--primary-medium); }
				#info { grid-area: info; border-left: 1px solid black; height: 100%; padding: 1rem; }
				#album-art { width: 100%; }
				button { font-size: 2rem; }
				button:hover { border: none; }
				.overflow { overflow-y: auto; }
				li { list-style: none; }
				tr td:first-child { font-weight: bold; }
			</style>
			<div id="instructions">Click to Start</div>
			<h1 id="title"></h1>
			<div class="overflow" id="track-list-container">
				<ul id="track-list"></ul>
			</div>
			<div id="info">
				<img id="album-art" />
				<table>
					<tr>
						<td>Title</td>
						<td id="info-title"></td>
					</tr>
					<tr>
						<td>Album</td>
						<td id="info-album"></td>
					</tr>
					<tr>
						<td>Artist</td>
						<td id="info-artist"></td>
					</tr>
					<tr>
						<td>Year</td>
						<td id="info-year"></td>
					</tr>
				</table>
			</div>
			<div id="controls" class="row">
				<button id="open" class="neu-button">Open</button>
				<button id="toggle-play">Play</button>
				<audio></audio>
			</div>
		`;
	}
	cacheDom() {
		this.dom = {
			title: this.shadowRoot.querySelector("h1"),
			albumArt: this.shadowRoot.querySelector("#album-art"),
			infoTitle: this.shadowRoot.querySelector("#info-title"),
			infoAlbum: this.shadowRoot.querySelector("#info-album"),
			infoArtist: this.shadowRoot.querySelector("#info-artist"),
			infoYear: this.shadowRoot.querySelector("#info-year"),
			audio: this.shadowRoot.querySelector("audio"),
			list: this.shadowRoot.querySelector("ul"),
			open: this.shadowRoot.querySelector("#open"),
			togglePlay: this.shadowRoot.querySelector("#toggle-play"),
			instructions: this.shadowRoot.querySelector("#instructions")
		};
	}
	attachEvents() {
		this.dom.open.addEventListener("click", this.open);
		this.dom.togglePlay.addEventListener("click", this.togglePlayClick);
		if(this.#handle){
			this.addEventListener("click", this.requestPermission);
		}
		this.shadowRoot.addEventListener("click", this.selectTrack, false);
	}
	async requestPermission(){
		this.shadowRoot.removeChild(this.dom.instructions);
		try{
			await this.#handle.requestPermission({ mode: "read" });
			this.isReady = true;
			this.removeEventListener("click", this.requestPermission);
			this.getFilesFromHandle();
		} catch(e){};
	}
	async open(){
		this.#handle = await window.showDirectoryPicker();
		await this.#storage.set("handle", this.#handle);
		this.isReady = true;
		this.getFiles();
	}
	async getFilesFromHandle(){
		this.addFiles(await collectAsyncIterableAsArray(filterAsyncIterable(this.#handle.values(), f => 
			f.kind === "file" && (f.name.endsWith(".mp3") || f.name.endsWith(".m4a")
			))));
	}
	async selectTrack(e){
		const fileWithMeta = this.#fileLinks.get(e.target);
		if(fileWithMeta){
			this.playFile(fileWithMeta);
		}
	}
	async addFiles(files, shouldPlay = false){
		this.isReady = true;
		const docFrag = document.createDocumentFragment();
		const filesWithMeta = []

		for(let file of files){
			filesWithMeta.push({ file, id3: getId3(await file.getFile().then(f => readAsArrayBuffer(f))) });
		}
		
		for(let fileWithMeta of filesWithMeta){
			this.#files.push(fileWithMeta);
			const li = document.createElement("li");
			li.textContent = fileWithMeta.id3["TIT2"] ?? fileWithMeta.file.name;
			docFrag.appendChild(li);
			this.#fileLinks.set(li, fileWithMeta);
		}

		this.dom.list.appendChild(docFrag);
		if(shouldPlay){
			this.playFile(filesWithMeta[0]);
		}
	}
	async playFile({ file, id3 = {} }){
		const fileData = await file.getFile();
		this.updateDisplay({ file, id3 });
		const url = URL.createObjectURL(fileData);
		this.dom.audio.src = url;
		
		this.togglePlay(true);
	}
	updateDisplay({ file, id3 = {}}){
		this.dom.title.textContent = id3["TIT2"] ?? file.name;
		this.dom.infoTitle.textContent = id3["TIT2"] ?? file.name;
		this.dom.infoAlbum.textContent = id3["TALB"] ?? "";
		this.dom.infoArtist.textContent = id3["TPE1"] ?? "";
		this.dom.infoYear.textContent = id3["TYER"] ?? "";
		
		
		if(id3["APIC"]){
			const url = URL.createObjectURL(new Blob([id3["APIC"][0].data]));
			this.dom.albumArt.src = url;
			//URL.revokeObjectURL(url);
		} else {
			this.dom.albumArt.src = "";
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
