# jsparser.cpp

This is a port of the [acorn.js](https://github.com/marijnh/acorn) parser to C++ and C. It is licensed under the MIT license.

This is accomplished by transpiling the JavaScript source (`lib/acorn_mod.js`) using a custom transpiler (`lib/transpile.js`) and exposing it through a simple interface (`src/jsparser.cpp`).

The compiler makes heavy use of the `auto` keyword and some GCC extensions. Check the Makefile for more information.

In the future, after much more testing and memory improvements, this will power the parser for the Colony runtime.

## License

MIT
