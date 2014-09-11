console.log('1..2')

console.log((a = i.i++) == 42 && a == 42 && i.i == 43 ? 'ok' : 'not ok', '#', i.i, a)
console.log((a = ++i.i) == 44 && a == 44 && i.i == 44 ? 'ok' : 'not ok', '#', i.i, a)
