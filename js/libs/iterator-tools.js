export async function* filterAsyncIterable(asyncIterable, filterFunc) {
	for await(const value of asyncIterable){
		if(filterFunc(value)) yield value;
	}
}
export async function collectAsyncIterableAsArray(asyncIterable) {
	const result = [];
	for await(const value of asyncIterable){
		result.push(value);
	}
	return result;
}