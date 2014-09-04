#!/usr/bin/env node

var fs = require('fs');
var acorn = require('./acorn_mod');

var input = String(fs.readFileSync(process.argv[2]));

var ret = acorn.parse(input, {
	onCloseNode: function (node, type) {
		console.log('type', type);
	}
})
console.log('done.');
