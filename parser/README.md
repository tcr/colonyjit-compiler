# jsparser.cpp

This is a port of the [acorn.js](https://github.com/marijnh/acorn) parser to C++ and C. It is licensed under the MIT license.

This is accomplished by transpiling the JavaScript source (`lib/acorn_mod.js`) using a custom transpiler (`lib/transpile.js`) and exposing it through a simple interface (`src/jsparser.cpp`).

The compiler makes heavy use of the `auto` keyword and some GCC extensions, so, `-std=gnu++1y`. Check the Makefile for more information.

### TODO

* Testing! Memory improvements! More testing!
* Strings are not actually parsed as UTF-8, just ASCII. A naive consequence of charCodeAt and length.
* Token names should be emitted as enums.
* Node structure should be reused. No children Nodes need be saved if they can be replaced with returned userdata from `onclosenode`.
* Ideally, remove the C++ runtime as a requirement.

## API

```c
void jsparse (const char* buf, size_t buf_len, void (*onclosenode)(const char *));
```

## License

MIT
