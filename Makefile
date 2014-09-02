all:
	gcc-4.9 -o jscompiler -ggdb -pagezero_size 10000 -image_base 100000000 ./luajit/src/libluajit.a ../jsparser.cpp/out/jsparser.a lj_parse.c -Iluajit/src -lstdc++ -std=c99
	./jscompiler test.js
	@echo ''
	@echo "bytecode:"
	luajit -bl out.bc
	@echo ''
	@echo "test:"
	luajit out.bc

clean:
	rm -rf *.dSYM lj jscompiler out.bc || true
