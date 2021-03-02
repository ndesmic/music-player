import { getString } from "./file-util.js";

function readLength(dataView, index){
	return (dataView.getUint8(index) << 21) | 
	(dataView.getUint8(index + 1) << 14) | 
	(dataView.getUint8(index + 2) << 7) |
	(dataView.getUint8(index + 3));
}

function readIso8859(dataView, offset, length = Infinity){
	const bytes = [];
	let i = 0;
	while (dataView.getUint8(offset + i) !== 0 && i < length) {
		bytes.push(dataView.getUint8(offset + i));
		i += 1;
	}
	return [new TextDecoder("iso-8859-1").decode(Uint8Array.from(bytes)), i];
}

function readUtf16(dataView, offset, length = Infinity){
	const bytes = [];
	let i = 0;
	while (dataView.getUint16(offset + i) !== 0 && i < length) {
		bytes.push(dataView.getUint8(offset + i));
		bytes.push(dataView.getUint8(offset + i + 1));
		i += 2;
	}
	let encoding;
	if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
		encoding = "utf-16le";
	} else if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
		encoding = "utf-16be";
	}
	return [new TextDecoder(encoding).decode(Uint8Array.from(bytes.slice(2))), i];
}

function readField(dataView, offset, length){
	const encodingType = dataView.getUint8(offset);
	return encodingType === 1
		? readUtf16(dataView, offset + 1, length - 1)[0]
		: readIso8859(dataView, offset + 1, length - 1)[0]
}

function readPicture(dataView, offset, length){
	const image = {};
	const encodingType = dataView.getUint8(offset);
	let i = 1;

	const mimeType = encodingType === 1
		? readUtf16(dataView, offset + 1)
		: readIso8859(dataView, offset + 1)

	image.mimeType = mimeType[0];
	i += mimeType[1] + 1; //the one is the null byte
	image.imageType = dataView.getUint8(offset + i);
	i += 1;

	const description = encodingType === 1
		? readUtf16(dataView, offset + i)
		: readIso8859(dataView, offset + i);

	image.description = description[0];
	i += description[1] + 1;

	image.data = dataView.buffer.slice(offset + i, offset + length);
	return image;
}

export function getId3(arrayBuffer){
	const dataView = new DataView(arrayBuffer);
	const id = getString(dataView, 0, 3);
	if(id !== "ID3") return {};
	const majorVersion = dataView.getUint8(3);
	const minorVersion = dataView.getUint8(4);
	const flags = dataView.getUint8(5);
	const size = readLength(dataView, 6);

	let currentSize = 0;
	let i = 10;
	const id3Tags = {};
	while(currentSize < size){
		const header = getString(dataView, i, 4).trim();
		i += 4;
		const length = dataView.getUint32(i);
		i += 4;
		const flags = dataView.getUint16(i);
		i += 2;
		
		switch(header){
			case "TIT2": //Title
			case "TPE1": //Performer
			case "TALB": //Album
			case "TCOM": //Composer
			case "TCON": //Content Type
			case "TPE2": //Band
			case "TPE3": //Conductor
			case "TPE4": //Remixer
			case "TRCK": //Track
			case "TYER": //Year
			case "COMM": //Comments
			case "TCOP": //Copyright
			case "TPOS": //Part of Set
			case "PRIV": //Private
			{
				id3Tags[header] = readField(dataView, i, length);
				i += length;
				break;
			}
			case "APIC": //Picture
			{
				const picture = readPicture(dataView, i, length);
				id3Tags[header] = id3Tags[header] ? [...id3Tags[header], picture] : [picture];
				i += length;
				break;
			}
			default:
				i += length;
		}
		currentSize += length;
	}

	return id3Tags;
}