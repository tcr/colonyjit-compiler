all: luajit/src/libluajit.a ./parser/out/jsparser.a
	gcc-4.9 -o colonyjit-compiler -ggdb -pagezero_size 10000 -image_base 100000000 \
		./luajit/src/libluajit.a ./parser/out/jsparser.a colonyjit-compiler.c -Iluajit/src -lstdc++ -std=c99

./parser/out/jsparser.a:
	cd parser; make

luajit/src/libluajit.a:
	cd luajit; make

dump-cmp:
	@echo "test.js (javascript) bytecode:"
	./colonyjit-compiler test.js 2>/dev/null | luajit -bl -
	@echo ''
	@echo 'test.lua bytecode:'
	luajit -bl test.lua

dump-test:
	@echo "test:"
	./colonyjit-compiler test.js | luajit loader.lua

clean:
	rm -rf *.dSYM lj colonyjit-compiler bytecode.lua || true

test:
	tinytap -e "luajit loader.lua {}" tests/*.js

update:
	git submodule update --init --recursive
	npm install
