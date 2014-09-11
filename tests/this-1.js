console.log('1..2')

a = 'ok'

console.log(global.a)

// This isn't how Node does it.
// console.log(this.a)

var b = function () {
	console.log(this.a);
}

b();
