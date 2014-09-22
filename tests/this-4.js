var a = {
	value: 'ok',
	test: function () {
		console.log(this.value)
		// return this == a;
	}
}

function b () {
	return a;
}

console.log('1..1');
b().test();
