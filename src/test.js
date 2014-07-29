#!/usr/bin/env node

var fs = require('fs');
var acorn = require('./acorn_mod');

var input = String(fs.readFileSync(__dirname + '/input.js'));

var ret = acorn.parse(input, {
	onCloseNode: function (node, type) {
		console.log('type', type);
	}
})
console.log('ok', ret.type);
console.log('done.');
