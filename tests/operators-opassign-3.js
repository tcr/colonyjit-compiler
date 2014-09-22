var bodyi = { vx: 0 }
var bodyj = { mass: 5} 

function a (i, j) {
	i.vx -= j.mass;
	console.log(j.mass == 5 ? 'ok' : 'not ok')
}

console.log('1..1');
a(bodyi, bodyj);
