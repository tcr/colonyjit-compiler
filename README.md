# colonyjit-compiler

To run:

```
make update
make
make test
```

## how

Create a compiled parser that transforms JS input into LuaJIT bytecode suitable for running in Colony.

* [acorn.js](https://github.com/marijnh/acorn) is cross compiled to C++ (see parser/ folder)
* `colonyjit-compiler.c` walks in lock-step with the acorn parser to produce luajit bytecode
* a subset of the original LuaJIT compiler is located in colonyjit-parser.c

## why

With minimal effort, this allows Colony to leverage an ECMAScript-compliant parser (Acorn) as it is updated.

LuaJIT bytecode is the basis of "colonyjit", a minor fork of the LuaJIT VM to add additional JS-specific bytecode and capabilities, and its corresponding JavaScript runtime.

## todo

* Lots of code / logic cleanup. This a big ol hack right now.
* Creating a structured AST is not necessary and should be removed from `acorn.ts`. To preserve tests, the event stream it emits can be used to reconstruct an AST and confirm that the results are equivalent.
* Testing! Memory improvements! More testing!
* Strings are not actually parsed as UTF-8, just ASCII. A naive consequence of charCodeAt and length.
* Token names should be emitted as enums.
* Remove the C++ runtime as a requirement.

## license

Acorn.js, LuaJIT, and this compiler are all licensed under MIT. Please see the original repositories for their respective licenses and source code.
