export function readAsArrayBuffer(file) {
	return new Promise(function (resolve, reject) {
		const reader = new FileReader();
		reader.onload = function (e) {
			resolve(e.target.result);
		};
		reader.onerror = function (e) {
			reject(e);
		};
		reader.readAsArrayBuffer(file);
	});
}

export function getString(dataView, offset, length) {
	let str = "";
	for (let i = 0; i < length; i++) {
		const code = dataView.getUint8(offset + i);
		str += String.fromCharCode(code);
	}
	return str;
}