console.log('1..2')

var a = 5;
a *= a *= a;
console.log(a == 125 ? 'ok' : 'not ok', '#', a);

var a = 5;
a = a * (a = a * (a));
console.log(a == 125 ? 'ok' : 'not ok', '#', a);
