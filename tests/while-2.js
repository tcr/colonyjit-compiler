console.log('1..2')

var i = 0;

while (++i < 5) {
	console.log('#', i);
}

console.log(i == 5 ? 'ok' : 'not ok')

var i = 0;

while (i++ < 5) {
	console.log('#', i);
}

console.log(i == 6 ? 'ok' : 'not ok')
