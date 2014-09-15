console.log('1..1')

var Body = function () {
}

Body.prototype.offsetMomentum = function() {
	console.log(typeof this == 'object' ? 'ok' : 'not ok')
}

var NBodySystem = function (bodies){
   var px = 0.0;
   bodies.offsetMomentum();
}

var bodies = new NBodySystem(new Body())
