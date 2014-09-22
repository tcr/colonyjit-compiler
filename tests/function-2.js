var a = console.log
a('1..1')
function b (key) {
	return typeof key
}
console.log(b(a) == 'function' ? 'ok' : 'not ok');
