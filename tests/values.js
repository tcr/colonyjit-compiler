console.log('1..9');

console.log(typeof true == 'boolean' ? 'ok' : 'not ok')
if (true) console.log('ok'); else console.log('not ok');
if (false) console.log('not ok'); else console.log('ok');

console.log(typeof 42 == 'number' ? 'ok' : 'not ok')
console.log(String(42) == '42' ? 'ok' : 'not ok')
console.log(String(42.555) == '42.555' ? 'ok' : 'not ok')

console.log(typeof 'hi' == 'string' ? 'ok' : 'not ok')

console.log(typeof null == 'object' ? 'ok' : 'not ok')

console.log('ok')