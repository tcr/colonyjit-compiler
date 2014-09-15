console.log('1..3')

var NBodySystem = function (bodies){
}

NBodySystem.prototype.energy = function(){
   console.log(typeof this == 'object' ? 'ok' : 'not ok')
}


var n = 1000000;
var bodies = new NBodySystem();

console.log(typeof bodies == 'object' ? 'ok' : 'not ok')
console.log(bodies.energy() == null ? 'ok' : 'not ok');
