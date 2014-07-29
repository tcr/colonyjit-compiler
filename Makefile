all: clean build try test

clean:
	rm -rf out/*

count:
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | wc -l

build:
	cp src/helper.c out
	cp src/main.cpp out
	node src/index.js src/acorn_mod.js > out/compiled.c

retry:
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 -D_GLIBCXX_FULLY_DYNAMIC_STRING

try:
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1

test:
	@./out/main > ./out/c.test
	@./src/test.js > ./out/js.test
	@diff ./out/c.test ./out/js.test | wc -l
	@rm ./out/*.test

tryh: build
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | head -n 45
