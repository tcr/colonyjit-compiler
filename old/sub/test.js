console.log('hi');
var acorn = require('acorn');

acorn.parse(require('fs').readFileSync('./node_modules/acorn/acorn.js'));