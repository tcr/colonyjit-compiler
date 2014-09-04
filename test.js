console.log('1..5')

if (typeof 5 == 'number') {
	console.log('ok')
} else {
	console.log('not ok')
}

if (typeof 'str' == 'number') {
	console.log('not ok')
} else {
	console.log('ok')
}

if (typeof 'str' == 'string') {
	if (typeof 5 == 'number') {
		console.log('ok')
	} else {
		console.log('not ok')	
	}
} else {
	console.log('ok')
}

if (typeof 5 != 'number') {
	console.log('not ok')
} else {
	console.log('ok')
}

console.log('ok')