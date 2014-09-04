all:
	gcc-4.9 -o colonyjit-compiler -ggdb -pagezero_size 10000 -image_base 100000000 \
		./luajit/src/libluajit.a ../jsparser.cpp/out/jsparser.a colonyjit-compiler.c -Iluajit/src -lstdc++ -std=c99

dump:
	@echo ''
	@echo "bytecode:"
	./colonyjit-compiler tests/test.js 2>/dev/null | luajit -bl -
	@echo ''
	@echo 'vs:'
	luajit -bl test.lua
	@echo ''
	@echo "test:"
	./colonyjit-compiler tests/test.js 2>/dev/null | luajit loader.lua

clean:
	rm -rf *.dSYM lj colonyjit-compiler bytecode.lua || true

test:
	tinytap -e "luajit loader.lua {}" tests/*.js