console.log('1..3');
var bodies = Array(0,1,2);
for (var i=0; i<3; i++){
  var b = bodies[i];
  console.log(b == i ? 'ok' : 'not ok', '#', b);
  var m = 5;
}
