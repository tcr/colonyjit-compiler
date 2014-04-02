var fs = require('fs');
var async = require('async');
var exec = require('child_process').exec;

var attempts = [];

var index = fs.readFileSync('./index.js', 'utf-8').split(/\n/);
for (var i = 0; i < index.length; i++) {
	var a = index.slice();
	a.splice(i, 1);
	if (index[i] && !index[i].match(/^\s*\/\//)) {
		attempts.push({i: i, a: a.join('\n')});
	}
}

async.eachSeries(attempts, function (att, next) {
	fs.writeFileSync('./index.js', att.a, 'utf-8');
	exec('make try', function (err) {
		if (!err) {
			console.log('line', att.i, JSON.stringify(index[att.i]));
		} else {
			// console.log('retry');
		}
		next();
	})
}, function () {
	fs.writeFileSync('./index.js', index.join('\n'), 'utf-8');
	console.log('done');
})