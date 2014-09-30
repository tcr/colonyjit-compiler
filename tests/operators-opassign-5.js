var a = 5;

a *= a *= a;
// a = a * (a = a * (a))

console.log('1..1')
console.log(a == 125 ? 'ok' : 'not ok', '#', a);
