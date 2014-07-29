all: build try

count:
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | wc -l

build:
	cp src/gum.c out
	cp src/main.cpp out
	node src/index.js src/acorn_mod.js > out/compiled.c

retry:
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 -D_GLIBCXX_FULLY_DYNAMIC_STRING

try: build
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1

tryh: build
	cd out; g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | head -n 45