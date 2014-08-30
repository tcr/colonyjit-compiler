.PHONY: test

all: clean transpile compile test

clean:
	rm -rf out/*

transpile:
	cp src/* out
	node lib/transpile.js lib/acorn.ts > out/compiled.c

compile:
	cd out; g++-4.9 jsparser.cpp -O2 -c -o jsparser.a -std=gnu++1y -g -ggdb 2>&1
	cd out; g++-4.9 jsparser.a main.c -O2 -o main -g -ggdb 2>&1

compile-small:
	cd out; g++-4.9 jsparser.cpp -O2 -c -o jsparser.a -std=gnu++1y -fno-exceptions -fno-rtti 2>&1
	cd out; g++-4.9 jsparser.a main.c -O2 -o main -fno-exceptions -fno-rtti -ffunction-sections -fdata-sections -Wl,-dead_strip 2>&1
	cd out; strip -S main
	ls -lah out/main

run:
	cd out; ./main

test:
	@./out/main ./lib/example.js | tee ./out/c.test > /dev/null
	@./lib/test.js ./lib/example.js > ./out/js.test
	diff ./out/c.test ./out/js.test 
	@echo "If there was no output, all tests passed."
	@rm ./out/*.test
