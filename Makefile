all: clean transpile compile test

clean:
	rm -rf out/*

transpile:
	cp src/* out
	node lib/transpile.js lib/acorn_mod.js > out/compiled.c

compile:
	cd out; g++-4.9 jsparser.cpp -Ofast -fno-inline -c -o jsparser.a -std=gnu++1y -w -g -ggdb 2>&1
	cd out; g++-4.9 jsparser.a main.c -Ofast -o main -g -ggdb 2>&1

run:
	cd out; ./main

test:
	@./out/main ./lib/input.js > ./out/c.test
	@./lib/test.js ./lib/input.js > ./out/js.test
	diff ./out/c.test ./out/js.test
	@rm ./out/*.test
