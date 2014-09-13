console.log('1..3')

var a = function (a, b) {
	console.log(a)
	console.log(b)
	return 'ok'
}

var b = new a ('ok', 'ok');
console.log(b);
