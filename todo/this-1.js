var NBodySystem = function (bodies){
}

NBodySystem.prototype.energy = function(){
   console.log('nbody', this)
}


var n = 1000000;
var bodies = new NBodySystem();

console.log('nbody1', bodies);
console.log(bodies.energy());
