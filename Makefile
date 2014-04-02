count:
	g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | wc -l

build:
	node index.js > out.c

retry:
	g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | head -n 15

try: build
	g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1

tryh: build
	g++-4.9 main.cpp -o main -std=gnu++1y -w -g -ggdb -fpermissive 2>&1 | head -n 45