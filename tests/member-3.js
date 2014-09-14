var bodies = Array(1, 2, 3)
var t = { bodies: bodies };
var j = t.bodies;

console.log('1..1');
console.log(j != null ? 'ok' : 'not ok');
