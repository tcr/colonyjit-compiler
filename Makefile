all: clean transpile compile test

clean:
	rm -rf out/*

transpile:
	cp src/helper.c out
	cp src/main.cpp out
	node src/index.js src/acorn_mod.js > out/compiled.c

compile:
	cd out; g++-4.9 main.cpp -O0 -o main -std=gnu++1y -w -g -ggdb 2>&1

run:
	cd out; ./main

test:
	@cd out; ./main > ./c.test
	@./src/test.js > ./out/js.test
	@diff ./out/c.test ./out/js.test
	@rm ./out/*.test
