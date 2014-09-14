/* The Computer Language Benchmarks Game
   http://benchmarksgame.alioth.debian.org/
   contributed by Isaac Gouy */

// console.log(1)

var PI = 3.141592653589793;
var SOLAR_MASS = 4 * PI * PI;
var DAYS_PER_YEAR = 365.24;

var Body = function (x,y,z,vx,vy,vz,mass){
   this.x = x;
   this.y = y;
   this.z = z;
   this.vx = vx;
   this.vy = vy;
   this.vz = vz;
   this.mass = mass;
}
