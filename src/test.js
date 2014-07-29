#!/usr/bin/env node

var acorn = require('./acorn_mod');

var ret = acorn.parse('console.log("hi");', {
	onCloseNode: function (node, type) {
		console.log('type', type);
	}
})
console.log('ok', ret.type);
console.log('done.');
