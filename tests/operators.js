console.log('1..9')

if (5 + 5 == 10) console.log('ok'); else console.log('not ok');
if (5 - 5 == 0) console.log('ok'); else console.log('not ok');
if (5 / 5 == 1) console.log('ok'); else console.log('not ok');
if (5 * 5 == 25) console.log('ok'); else console.log('not ok');
if (24 % 5 == 4) console.log('ok'); else console.log('not ok');

console.log(empty('not ok') || 'ok')
empty('not ok') || console.log('ok');
console.log('not ok' && 'ok')
empty('ok') || console.log('ok');
