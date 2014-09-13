console.log('1..3')

var a = 0

a += 1

a += 1

console.log(a == 2 ? 'ok' : 'not ok')

var b = {"i": 0}

b.i += 1
b.i += 1

console.log(b.i == 2 ? 'ok' : 'not ok')

b.i = 3

console.log(b.i == 3 ? 'ok' : 'not ok')
