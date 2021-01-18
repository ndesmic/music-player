const defaults = {
	name: "idb-storage",
	siloName: "db-cache"
};

export class IdbStorage {
	constructor(options) {
		this.options = { ...defaults, ...options };
		this.bind(this);
		this.idbPromise = this.openIndexDb();
	}

	bind(idbStorage) {
		this.get = this.get.bind(idbStorage);
		this.get = this.get.bind(idbStorage);
		this.getAll = this.getAll.bind(idbStorage);
		this.set = this.set.bind(idbStorage);
		this.openIndexDb = this.openIndexDb.bind(idbStorage);
	}

	get(key) {
		return new Promise((resolve, reject) => {
			this.idbPromise
				.then(idb => {
					const transaction = idb.transaction(this.options.siloName, "readonly");
					const store = transaction.objectStore(this.options.siloName);
					const request = store.get(key);
					request.onerror = () => reject(request.error);
					request.onsuccess = e => resolve(e.target.result);
				});
		});
	}

	getAll() {
		return new Promise((resolve, reject) => {
			this.idbPromise
				.then(idb => {
					const transaction = idb.transaction(this.options.siloName, "readonly");
					const store = transaction.objectStore(this.options.siloName);
					const request = store.getAll();
					request.onerror = () => reject(request.error);
					request.onsuccess = e => resolve(e.target.result);
				});
		});
	}

	set(key, value) {
		return new Promise((resolve, reject) => {
			this.idbPromise
				.then(idb => {
					const transaction = idb.transaction(this.options.siloName, "readwrite");
					const store = transaction.objectStore(this.options.siloName);
					const request = store.put(value, key);
					request.onerror = () => reject(request.error);
					request.onsuccess = e => resolve(e.target.result);
				});
		});
	}

	openIndexDb() {
		return new Promise((resolve, reject) => {
			let openRequest = indexedDB.open(this.options.name, 1);
			openRequest.onerror = () => reject(openRequest.error);
			openRequest.onupgradeneeded = e => {
				if (!e.target.result.objectStoreNames.contains(this.options.siloName)) {
					e.target.result.createObjectStore(this.options.siloName);
				}
			};
			openRequest.onsuccess = () => resolve(openRequest.result);
		});
	}
}