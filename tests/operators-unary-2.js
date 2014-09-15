var test = function () {
	var a = 5
	return typeof a
}

console.log('1..1')
console.log(test() == 'number' ? 'ok' : 'not ok')
