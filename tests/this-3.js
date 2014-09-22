console.log('1..4')

var Body = function () {
}

Body.prototype.offsetMomentum = function(a, b, c) {
	console.log(a == 1 ? 'ok' : 'not ok')
	console.log(b == 2 ? 'ok' : 'not ok')
	console.log(c == 3 ? 'ok' : 'not ok')
	console.log(typeof this == 'object' ? 'ok' : 'not ok')
}

var NBodySystem = function (bodies){
   bodies.offsetMomentum(1, 2, 3);
}

var bodies = new NBodySystem(new Body())
