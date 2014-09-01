all:
	gcc-4.9 -o lj -ggdb -pagezero_size 10000 -image_base 100000000 ./luajit/src/libluajit.a ../jsparser.cpp/out/jsparser.a lj_parse.c -Iluajit/src -lstdc++ -std=c99
