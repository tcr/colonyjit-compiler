all: luajit/src/libluajit.a
	cd parser; make
	gcc-4.9 -o colonyjit-compiler -ggdb -pagezero_size 10000 -image_base 100000000 \
		./luajit/src/libluajit.a ./parser/out/jsparser.a colonyjit-compiler.c -Iluajit/src -lstdc++ -std=c99

luajit/src/libluajit.a:
	cd luajit; make

dump-cmp:
	@echo ''
	@echo "bytecode:"
	./colonyjit-compiler tests/test.js 2>/dev/null | luajit -bl -
	@echo ''
	@echo 'vs:'
	luajit -bl test.lua
	@echo ''

dump-test:
	@echo "test:"
	./colonyjit-compiler tests/test.js | luajit loader.lua

clean:
	rm -rf *.dSYM lj colonyjit-compiler bytecode.lua || true

test:
	tinytap -e "luajit loader.lua {}" tests/*.js

update:
	git submodule update --init --recursive
	npm install
