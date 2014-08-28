// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke and various contributors and
// released under an MIT license. The Unicode regexps (for identifiers
// and whitespace) were taken from [Esprima](http://esprima.org) by
// Ariya Hidayat.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/marijnh/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/marijnh/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

;

auto version = "0.6.1"; 

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api], with the caveat that inline XML is not recognized.
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API
options_t options = {ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, ranges: false, program: null, sourceFile: "", directSourceFile: ""};  auto input = std::string();  auto inputLen = 0;  std::string sourceFile = std::string(); 

auto parse(auto inpt, auto opts) {
    input = String(inpt);
    inputLen = input.length();
    setOptions(opts);
    initTokenState();
    return parseTopLevel(options.program);
}
;

// A second optional argument can be given to further configure
// the parser process. These options are recognized:
options_t defaultOptions = {ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, ranges: true, program: null, sourceFile: "", directSourceFile: ""}; 



// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

;


;

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenize` export provides an interface to the tokenizer.
// Because the tokenizer is optimized for being efficiently used by
// the Acorn parser itself, this interface is somewhat crude and not
// very modular. Performing another parse or call to `tokenize` will
// reset the internal state, and invalidate existing tokenizers.

;

// State is kept in (closure-)global variables. We already saw the
// `options`, `input`, and `inputLen` variables above.
// The current position of the tokenizer in the input.
auto tokPos = 0; 

// The start and end offsets of the current token.
int tokStart = 0;  int tokEnd = 0; 

// When `options.locations` is true, these hold objects
// containing the tokens start and end line/column pairs.
int tokStartLoc = 0;  int tokEndLoc = 0; 

// The type and value of the current token. Token types are objects,
// named by variables against which they can be compared, and
// holding properties that describe them (indicating, for example,
// the precedence of an infix opr, and the original name of a
// keyword token). The kind of value that's held in `tokVal` depends
// on the type of the token. For literals, it is the literal value,
// for operators, the opr name, and so on.
keyword_t tokType = {};  std::string tokVal = std::string(); 

// Internal state for the tokenizer. To distinguish between division
// operators and regular expressions, it remembers whether the last
// token was one that is allowed to be followed by an expression.
// (If it is, a slash is probably a regexp, if it isn't it's a
// division opr. See the `parseStatement` function for a
// caveat.)
auto tokRegexpAllowed = 0; 

// When `options.locations` is true, these are used to keep
// track of the current line, and know when a new line has been
// entered.
auto tokCurLine = 0;  auto tokLineStart = 0; 

// These store the position of the previous token, which is useful
// when finishing a node and assigning its `end` position.
auto lastStart = 0;  auto lastEnd = 0;  auto lastEndLoc = 0; 


auto inFunction = 0;  auto inGenerator = 0;  auto labels = std::vector<label_t>();  auto strict = 0; 

// This counter is used for checking that arrow expressions did
// not contain nested parentheses in argument list.
auto metParenL = 0; 

// This is used by parser for detecting if it's inside ES6
// Template String. If it is, it should treat '$' as prefix before
// '{expression}' and everything else as string literals.
auto inTemplate = 0; 

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.


// Reused empty array added for node fields that are always empty.
auto empty = std::vector<Node*>({}); 


// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.
// All token type variables start with an underscore, to make them
// easy to recognize.
// These are the general types. The `type` property is only used to
// make them recognizeable when debugging.
 struct keyword_t  _num = {_id: 2, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "num"}, _regexp = {_id: 3, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "regexp"}, _string = {_id: 4, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "string"};;
 struct keyword_t  _name = {_id: 5, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "name"}, _eof = {_id: 6, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "eof"};;

// Keyword tokens. The `keyword` property (also used in keyword-like
// operators) indicates that the token originated from an
// identifier-like word, which is used when parsing property names.
//
// The `beforeExpr` property is used to disambiguate between regular
// expressions and divisions. It is set on all token types that can
// be followed by an expression (thus, a slash after them would be a
// regular expression).
//
// `isLoop` marks a keyword as starting a loop, which is important
// to know when parsing a label, in order to allow or disallow
// continue jumps to that label.
 struct keyword_t  _break = {_id: 7, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "break", postfix: false, prefix: false, type: ""}, _case = {_id: 8, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "case", postfix: false, prefix: false, type: ""}, _catch = {_id: 9, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "catch", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _continue = {_id: 10, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "continue", postfix: false, prefix: false, type: ""}, _debugger = {_id: 11, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "debugger", postfix: false, prefix: false, type: ""}, _default = {_id: 12, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "default", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _do = {_id: 13, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "do", postfix: false, prefix: false, type: ""}, _else = {_id: 14, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "else", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _finally = {_id: 15, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "finally", postfix: false, prefix: false, type: ""}, _for = {_id: 16, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "for", postfix: false, prefix: false, type: ""}, _function = {_id: 17, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "function", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _if = {_id: 18, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "if", postfix: false, prefix: false, type: ""}, _return = {_id: 19, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "return", postfix: false, prefix: false, type: ""}, _switch = {_id: 20, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "switch", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _throw = {_id: 21, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "throw", postfix: false, prefix: false, type: ""}, _try = {_id: 22, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "try", postfix: false, prefix: false, type: ""}, _var = {_id: 23, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "var", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _let = {_id: 24, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "let", postfix: false, prefix: false, type: ""}, _const = {_id: 25, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "const", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _while = {_id: 26, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "while", postfix: false, prefix: false, type: ""}, _with = {_id: 27, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "with", postfix: false, prefix: false, type: ""}, _new = {_id: 28, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "new", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _this = {_id: 29, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "this", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _class = {_id: 30, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "class", postfix: false, prefix: false, type: ""}, _extends = {_id: 31, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "extends", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _export = {_id: 32, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "export", postfix: false, prefix: false, type: ""}, _import = {_id: 33, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "import", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _yield = {_id: 34, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "yield", postfix: false, prefix: false, type: ""};;

// The keywords that denote values.
 struct keyword_t  _null = {_id: 35, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "null", postfix: false, prefix: false, type: ""}, _true = {_id: 36, atomValue: ATOM_TRUE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "true", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _false = {_id: 37, atomValue: ATOM_FALSE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "false", postfix: false, prefix: false, type: ""};;

// Some keywords are treated as regular operators. `in` sometimes
// (when parsing `for`) needs to be tested against specifically, so
// we assign a variable name to it for quick comparing.
 struct keyword_t  _in = {_id: 38, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "in", postfix: false, prefix: false, type: ""};;

// Map keyword names to token types.
auto __ignore = 0;  keyword_t keywordTypes(std::string arg) { if (arg == "break") { return _break; } if (arg == "case") { return _case; } if (arg == "catch") { return _catch; } if (arg == "continue") { return _continue; } if (arg == "debugger") { return _debugger; } if (arg == "default") { return _default; } if (arg == "do") { return _do; } if (arg == "else") { return _else; } if (arg == "finally") { return _finally; } if (arg == "for") { return _for; } if (arg == "function") { return _function; } if (arg == "if") { return _if; } if (arg == "return") { return _return; } if (arg == "switch") { return _switch; } if (arg == "throw") { return _throw; } if (arg == "try") { return _try; } if (arg == "var") { return _var; } if (arg == "let") { return _let; } if (arg == "const") { return _const; } if (arg == "while") { return _while; } if (arg == "with") { return _with; } if (arg == "null") { return _null; } if (arg == "true") { return _true; } if (arg == "false") { return _false; } if (arg == "new") { return _new; } if (arg == "in") { return _in; } if (arg == "this") { return _this; } if (arg == "class") { return _class; } if (arg == "extends") { return _extends; } if (arg == "export") { return _export; } if (arg == "import") { return _import; } if (arg == "yield") { return _yield; } return {}; } ;

// Punctuation token types. Again, the `type` property is purely for debugging.
 struct keyword_t  _bracketL = {_id: 39, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "["}, _bracketR = {_id: 40, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "]"}, _braceL = {_id: 41, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "{"};;
 struct keyword_t  _braceR = {_id: 42, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "}"}, _parenL = {_id: 43, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "("}, _parenR = {_id: 44, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ")"};;
 struct keyword_t  _comma = {_id: 45, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ","}, _semi = {_id: 46, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ";"};;
 struct keyword_t  _colon = {_id: 47, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ":"}, _dot = {_id: 48, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "."}, _ellipsis = {_id: 49, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "..."}, _question = {_id: 50, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "?"};;
 struct keyword_t  _arrow = {_id: 51, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "=>"}, _bquote = {_id: 52, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "`"}, _dollarBraceL = {_id: 53, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "${"};;

// Operators. These carry several kinds of properties to help the
// parser use them properly (the presence of these properties is
// what categorizes them as operators).
//
// `binop`, when present, specifies that this opr is a binary
// opr, and will refer to its precedence.
//
// `prefix` and `postfix` mark the opr as a prefix or postfix
// unary opr. `isUpdate` specifies that the node produced by
// the opr should be of type UpdateExpression rather than
// simply UnaryExpression (`++` and `--`).
//
// `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
// binary operators with a very low precedence, that should result
// in AssignmentExpression nodes.
 struct keyword_t  _slash = {_id: 54, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}, _eq = {_id: 55, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _assign = {_id: 56, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _incDec = {_id: 57, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: true, keyword: "", postfix: true, prefix: true, type: ""}, _prefix = {_id: 58, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""};;
 struct keyword_t  _logicalOR = {_id: 59, atomValue: ATOM_NULL, beforeExpr: true, binop: 1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _logicalAND = {_id: 60, atomValue: ATOM_NULL, beforeExpr: true, binop: 2, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _bitwiseOR = {_id: 61, atomValue: ATOM_NULL, beforeExpr: true, binop: 3, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _bitwiseXOR = {_id: 62, atomValue: ATOM_NULL, beforeExpr: true, binop: 4, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _bitwiseAND = {_id: 63, atomValue: ATOM_NULL, beforeExpr: true, binop: 5, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _equality = {_id: 64, atomValue: ATOM_NULL, beforeExpr: true, binop: 6, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _relational = {_id: 65, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _bitShift = {_id: 66, atomValue: ATOM_NULL, beforeExpr: true, binop: 8, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;
 struct keyword_t  _plusMin = {_id: 67, atomValue: ATOM_NULL, beforeExpr: true, binop: 9, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""};;
 struct keyword_t  _modulo = {_id: 68, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;

// '*' may be multiply or have special meaning in ES6
 struct keyword_t  _star = {_id: 69, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};;

// Provide access to the token types for external users of the
// tokenizer.
auto tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR, parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon, dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string, arrow: _arrow, bquote: _bquote, dollarBraceL: _dollarBraceL}; 

// for (var kw in keywordTypes) (<{[index:string]:any}><any>tokTypes)["_" + kw] = (<{[index:string]:any}><any>keywordTypes)[kw];
// This is a trick taken from Esprima. It turns out that, on
// non-Chrome browsers, to check whether a string is in a set, a
// predicate containing a big ugly `switch` statement is faster than
// a regular expression, and on Chrome the two are about on par.
// This function uses `eval` (non-lexical) to produce such a
// predicate from a space-separated string of words.
//
// It starts by sorting the words by.length().


// The ECMAScript 3 reserved word list.
auto isReservedWord3 = predicate_0; 

// ECMAScript 5 reserved words.
auto isReservedWord5 = predicate_1; 

// The additional reserved words in strict mode.
auto isStrictReservedWord = predicate_2; 

// The forbidden variable names in strict mode.
auto isStrictBadIdWord = predicate_3; 

// And the keywords.
auto ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"; 

auto isEcma5AndLessKeyword = predicate_4; 

auto isEcma6Keyword = predicate_5; 

auto isKeyword = isEcma5AndLessKeyword; 

// ## Character categories
// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `tools/generate-identifier-regex.js`.
auto nonASCIIwhitespace = regex_6; 

// var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
// var nonASCIIidentifierChars = "\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19B0-\u19C0\u19C8\u19C9\u19D0-\u19D9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF5\u1DFC-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA620-\uA629\uA66F\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F1\uA900-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F";
auto nonASCIIidentifierStart = regex_7; 
auto nonASCIIidentifier = regex_8; 

// Whether a single character denotes a newline.
auto newline = regex_9; 

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.
auto lineBreak = regex_10; 

// Test whether a given character code starts an identifier.
auto isIdentifierStart(auto code) {
    if (code < 65) {
return code==36;
}
    if (code < 91) {
return true;
}
    if (code < 97) {
return code==95;
}
    if (code < 123) {
return true;
}
    return code >= 0xaa && test(nonASCIIidentifierStart, fromCharCode(code));
}
;

// Test whether a given character is part of an identifier.
auto isIdentifierChar(auto code) {
    if (code < 48) {
return code==36;
}
    if (code < 58) {
return true;
}
    if (code < 65) {
return false;
}
    if (code < 91) {
return true;
}
    if (code < 97) {
return code==95;
}
    if (code < 123) {
return true;
}
    return code >= 0xaa && test(nonASCIIidentifier, fromCharCode(code));
}
;

// ## Tokenizer
// These are used when `options.locations` is on, for the
// `tokStartLoc` and `tokEndLoc` properties.
// var Position = (function () {
    auto Position() {
        THIS.line = tokCurLine;
        THIS.column = tokPos - tokLineStart;
    }
//     return Position;
// })();

// Reset the token state. Used at the start of a parse.
int initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    metParenL = 0;
    inTemplate = false;
    skipSpace();
}

// Called at the end of every token. Sets `tokEnd`, `tokVal`, and
// `tokRegexpAllowed`, and skips the space after the token, so that
// the next one's `tokStart` will point at the right position.
int finishToken(keyword_t type, std::string val) {
    tokEnd = tokPos;

    // if (options.locations) tokEndLoc = Position;
    tokType = type;
    if (LOGICALOR(type!=_bquote,inTemplate)) {
skipSpace();
}
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
    // if (options.onToken) {
    //   options.onToken(getCurrentToken());
    // }
}

auto skipBlockComment() {
    // var startLoc = options.onComment && options.locations && Position;
    auto start = tokPos;  auto end = indexOf(input, "*/", tokPos += 2); 
    if (end==-1) {
raise(tokPos - 2, "Unterminated comment");
}
    tokPos = end + 2;
    // if (options.locations) {
    //   lineBreak.lastIndex = start;
    //   var match:RegExpExecArray;
    //   while ((match = lineBreak.exec(input)) && match.index < tokPos) {
    //     ++tokCurLine;
    //     tokLineStart = match.index + match[0].length();
    //   }
    // }
    // if (options.onComment)
    //   options.onComment(true, input.slice(start + 2, end), start, tokPos,
    //                     startLoc, options.locations && Position);
}

auto skipLineComment() {
    auto start = tokPos; 

    // var startLoc = options.onComment && options.locations && Position;
    auto ch = charCodeAt(input, tokPos += 2); 
    while (tokPos < inputLen && ch!=10 && ch!=13 && ch!=8232 && ch!=8233) {
        ++tokPos;
        ch = charCodeAt(input, tokPos);
    }
    // if (options.onComment)
    //   options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
    //                     startLoc, options.locations && Position);
}

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.
int skipSpace() {
    while (tokPos < inputLen) {
        auto ch = charCodeAt(input, tokPos); 
        if (ch==32) {
{
            ++tokPos;
        }
} else if (ch==13) {
{
            ++tokPos;
            auto next = charCodeAt(input, tokPos); 
            if (next==10) {
{
                ++tokPos;
            }
}
            // if (options.locations) {
            //   ++tokCurLine;
            //   tokLineStart = tokPos;
            // }
        }
} else if (LOGICALOR(LOGICALOR(ch==10,ch==8232),ch==8233)) {
{
            ++tokPos;
            // if (options.locations) {
            //   ++tokCurLine;
            //   tokLineStart = tokPos;
            // }
        }
} else if (ch > 8 && ch < 14) {
{
            ++tokPos;
        }
} else if (ch==47) {
{
            auto next = charCodeAt(input, tokPos + 1); 
            if (next==42) {
{
                skipBlockComment();
            }
} else if (next==47) {
{
                skipLineComment();
            }
} else break;
        }
} else if (ch==160) {
{
            ++tokPos;
        }
} else if (ch >= 5760 && test(nonASCIIwhitespace, fromCharCode(ch))) {
{
            ++tokPos;
        }
} else {
            break;
        }
    }
}

// ### Token reading
// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because opr parsing has been inlined
// into it.
//
// All in the name of speed.
//
// The `forceRegexp` parameter is used in the one case where the
// `tokRegexpAllowed` trick does not work. See `parseStatement`.
auto readToken_dot() {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next >= 48 && next <= 57) {
return readNumber(true);
}
    auto next2 = charCodeAt(input, tokPos + 2); 
    if (options.ecmaVersion >= 6 && next==46 && next2==46) {
{
        tokPos += 3;
        return finishToken(_ellipsis);
    }
} else {
        ++tokPos;
        return finishToken(_dot);
    }
}

int readToken_slash() {
    auto next = charCodeAt(input, tokPos + 1); 
    if (tokRegexpAllowed) {
{
        ++tokPos;
        return readRegexp();
    }
}
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(_slash, 1);
}

auto readToken_mult_modulo(auto code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(code==42 ? _star : _modulo, 1);
}

auto readToken_pipe_amp(auto code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==code) {
return finishOp(code==124 ? _logicalOR : _logicalAND, 2);
}
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(code==124 ? _bitwiseOR : _bitwiseAND, 1);
}

auto readToken_caret() {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(_bitwiseXOR, 1);
}

auto readToken_plus_min(auto code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==code) {
{
        if (next == 45 && charCodeAt(input, tokPos + 2) == 62 && test(newline, slice(input, lastEnd, tokPos))) {
{
            // A `-->` line comment
            tokPos += 3;
            skipLineComment();
            skipSpace();
            return readToken();
        }
}
        return finishOp(_incDec, 2);
    }
}
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(_plusMin, 1);
}

auto readToken_lt_gt(auto code) {
    auto next = charCodeAt(input, tokPos + 1); 
    int size = 1; 
    if (next==code) {
{
        size = code==62 && charCodeAt(input, tokPos + 2)==62 ? 3 : 2;
        if (charCodeAt(input, tokPos + size)==61) {
return finishOp(_assign, size + 1);
}
        return finishOp(_bitShift, size);
    }
}
    if (next == 33 && code == 60 && charCodeAt(input, tokPos + 2) == 45 && charCodeAt(input, tokPos + 3) == 45) {
{
        // `<!--`, an XML-style comment that should be interpreted as a line comment
        tokPos += 4;
        skipLineComment();
        skipSpace();
        return readToken();
    }
}
    if (next==61) {
size = charCodeAt(input, tokPos + 2)==61 ? 3 : 2;
}
    return finishOp(_relational, size);
}

auto readToken_eq_excl(auto code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==61) {
return finishOp(_equality, charCodeAt(input, tokPos + 2)==61 ? 3 : 2);
}
    if (code==61 && next==62 && options.ecmaVersion >= 6) {
{
        tokPos += 2;
        return finishToken(_arrow);
    }
}
    return finishOp(code==61 ? _eq : _prefix, 1);
}

bool getTokenFromCode(int code) {
    // Special rules work inside ES6 template strings.
    if (inTemplate) {
{
        // '`' and '${' have special meanings, but they should follow string (can be empty)
        if (tokType==_string) {
{
            if (code==96) {
{
                ++tokPos;
                {finishToken(_bquote); return true;};
            }
}
            if (code==36 && charCodeAt(input, tokPos + 1)==123) {
{
                tokPos += 2;
                {finishToken(_dollarBraceL); return true;};
            }
}
        }
}

        // anything else is considered string literal
        {readString(); return true;};
    }
}

    switch (code) {
        case 46:{
            {readToken_dot(); return true;};}

        case 40:{
            ++tokPos;
            {finishToken(_parenL); return true;};}
        case 41:{
            ++tokPos;
            {finishToken(_parenR); return true;};}
        case 59:{
            ++tokPos;
            {finishToken(_semi); return true;};}
        case 44:{
            ++tokPos;
            {finishToken(_comma); return true;};}
        case 91:{
            ++tokPos;
            {finishToken(_bracketL); return true;};}
        case 93:{
            ++tokPos;
            {finishToken(_bracketR); return true;};}
        case 123:{
            ++tokPos;
            {finishToken(_braceL); return true;};}
        case 125:{
            ++tokPos;
            {finishToken(_braceR); return true;};}
        case 58:{
            ++tokPos;
            {finishToken(_colon); return true;};}
        case 63:{
            ++tokPos;
            {finishToken(_question); return true;};}

        case 96:{
            if (options.ecmaVersion >= 6) {
{
                ++tokPos;
                {finishToken(_bquote); return true;};
            }
}}

        case 48:{
            auto next = charCodeAt(input, tokPos + 1); 
            if (LOGICALOR(next==120,next==88)) {
{readRadixNumber(16); return true;}
};
            if (options.ecmaVersion >= 6) {
{
                if (LOGICALOR(next==111,next==79)) {
{readRadixNumber(8); return true;}
};
                if (LOGICALOR(next==98,next==66)) {
{readRadixNumber(2); return true;}
};
            }
}}

        case 49:{}
        case 50:{}
        case 51:{}
        case 52:{}
        case 53:{}
        case 54:{}
        case 55:{}
        case 56:{}
        case 57:{
            {readNumber(false); return true;};}

        case 34:{}
        case 39:{
            {readString(code); return true;};}

        case 47:{
            {readToken_slash(); return true;};}

        case 37:{}
        case 42:{
            {readToken_mult_modulo(code); return true;};}

        case 124:{}
        case 38:{
            {readToken_pipe_amp(code); return true;};}

        case 94:{
            {readToken_caret(); return true;};}

        case 43:{}
        case 45:{
            {readToken_plus_min(code); return true;};}

        case 60:{}
        case 62:{
            {readToken_lt_gt(code); return true;};}

        case 61:{}
        case 33:{
            {readToken_eq_excl(code); return true;};}

        case 126:{
            {finishOp(_prefix, 1); return true;};}
    }

    return false;
}

int readToken(bool forceRegexp) {
    if (!forceRegexp) {
tokStart = tokPos;
} else tokPos = tokStart + 1;

    // if (options.locations) tokStartLoc = Position;
    if (forceRegexp) {
return readRegexp();
}
    if (tokPos >= inputLen) {
return finishToken(_eof);
}

    auto code = charCodeAt(input, tokPos); 

    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (!inTemplate && (LOGICALOR(isIdentifierStart(code),code==92))) {
return readWord();
}

    auto tok = getTokenFromCode(code); 

    if (tok==false) {
{
        // If we are here, we either found a non-ASCII identifier
        // character, or something that's entirely disallowed.
        auto ch = fromCharCode(code); 
        if (LOGICALOR(ch=="\\",test(nonASCIIidentifierStart, ch))) {
return readWord();
}
        raise(tokPos, std::string("Unexpected character '") + ch + std::string("'"));
    }
}
    return tok;
}

int finishOp(keyword_t type, int size) {
    auto str = slice(input, tokPos, tokPos + size); 
    tokPos += size;
    finishToken(type, str);
}

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.
int readRegexp() {
    std::string content = "";  auto escaped = 0;  auto inClass = 0;  auto start = tokPos; 
    ; for (; ;)
{
        if (tokPos >= inputLen) {
raise(start, "Unterminated regular expression");
}
        auto ch = charAt(input, tokPos); 
        if (test(newline, ch)) {
raise(start, "Unterminated regular expression");
}
        if (!escaped) {
{
            if (ch=="[") {
inClass = true;
} else if (ch=="]" && inClass) {
inClass = false;
} else if (ch=="/" && !inClass) {
break;
}
            escaped = ch=="\\";
        }
} else escaped = false;
        ++tokPos;
    }
    content = slice(input, start, tokPos); 
    ++tokPos;

    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    auto mods = readWord1(); 
    if (mods && !test(([](std::string arg)->bool {  for (size_t i=0;i<arg.length();i++) { switch ((int) arg[i]) {  case 0x67: case 0x6d: case 0x73: case 0x69: case 0x79: break; default: return false;  } }  return true; }), mods)) {
raise(start, "Invalid regular expression flag");
}

    // try {
    auto value = content;

    // } catch (e) {
    // if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message);
    // raise(e);
    if (ISNULL(value)) {
{
        raise(start, "Error parsing regular expression.");
    }
}

    // }
    return finishToken(_regexp, value);
}

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `null` unless the integer has exactly `len` digits.
int readInt(int radix, int len) {
    auto start = tokPos;  auto total = 0; 
    auto i = 0;  auto e = ISNULL(len) ? Infinity : len; ; for (; i < e;)
{
        auto code = charCodeAt(input, tokPos);  auto intval = 0; 
        if (code >= 97) {
intval = code - 97 + 10;
} else if (code >= 65) {
intval = code - 65 + 10;
} else if (code >= 48 && code <= 57) {
intval = code - 48;
} else intval = Infinity;
        if (intval >= radix) {
break;
}
        ++tokPos;
        total = total * radix + intval;
    }
    if (LOGICALOR(tokPos==start,ISNOTNULL(len) && tokPos - start!=len)) {
return DBL_NULL;
}

    return total;
}

int readRadixNumber(int radix) {
    tokPos += 2; // 0x
    auto intval = readInt(radix); 
    if (ISNULL(intval)) {
raise(tokStart + 2, std::string("Expected number in radix ") + radix);
}
    if (isIdentifierStart(charCodeAt(input, tokPos))) {
raise(tokPos, "Identifier directly after number");
}
    return finishToken(_num, intval);
}

// Read an integer, octal integer, or floating-point number.
int readNumber(bool startsWithDot) {
    auto start = tokPos;  auto isFloat = false;  auto octal = charCodeAt(input, tokPos)==48; 
    if (!startsWithDot && ISNULL(readInt(10))) {
raise(start, "Invalid number");
}
    if (charCodeAt(input, tokPos)==46) {
{
        ++tokPos;
        readInt(10);
        isFloat = true;
    }
}
    auto next = charCodeAt(input, tokPos); 
    if (LOGICALOR(next==69,next==101)) {
{
        next = charCodeAt(input, ++tokPos);
        if (LOGICALOR(next==43,next==45)) {
++tokPos;
} // '+-'
        if (ISNULL(readInt(10))) {
raise(start, "Invalid number");
}
        isFloat = true;
    }
}
    if (isIdentifierStart(charCodeAt(input, tokPos))) {
raise(tokPos, "Identifier directly after number");
}

    auto str = slice(input, start, tokPos);  auto intval = 0; 
    if (isFloat) {
intval = parseFloat(str);
} else if (LOGICALOR(!octal,str.length()==1)) {
intval = parseInt(str, 10);
} else if (LOGICALOR(test(([](std::string arg)->bool {  for (size_t i=0;i<arg.length();i++) { switch ((int) arg[i]) {  case 0x38: case 0x39: return true; default: break;  } }  return false; }), str),strict)) {
raise(start, "Invalid number");
} else intval = parseInt(str, 8);
    return finishToken(_num, intval);
}

// Read a string value, interpreting backslash-escapes.
auto readCodePoint() {
    auto ch = charCodeAt(input, tokPos);  auto code = 0; 

    if (ch==123) {
{
        if (options.ecmaVersion < 6) {
unexpected();
}
        ++tokPos;
        code = readHexChar(indexOf(input, "}", tokPos) - tokPos);
        ++tokPos;
        if (code > 0x10FFFF) {
unexpected();
}
    }
} else {
        code = readHexChar(4);
    }

    // UTF-16 Encoding
    if (code <= 0xFFFF) {
{
        return fromCharCode(code);
    }
}
    auto cu1 = ((code - 0x10000) >> 10) + 0xD800; 
    auto cu2 = ((code - 0x10000) & 1023) + 0xDC00; 
    return fromCharCode(cu1, cu2);
}

int readString(int quote) {
    if (!inTemplate) {
tokPos++;
}
    std::string out = ""; 
    ; for (; ;)
{
        if (tokPos >= inputLen) {
raise(tokStart, "Unterminated string constant");
}
        auto ch = charCodeAt(input, tokPos); 
        if (inTemplate) {
{
            if (LOGICALOR(ch==96,ch==36 && charCodeAt(input, tokPos + 1)==123)) {
return finishToken(_string, out);
}
        }
} else if (ch==quote) {
{
            ++tokPos;
            return finishToken(_string, out);
        }
}
        if (ch==92) {
{
            ch = charCodeAt(input, ++tokPos);
            auto octalmatch = exec(([](std::string arg)->bool {  for (size_t i=0;i<arg.length();i++) { switch ((int) arg[i]) {  case 0x30 ... 0x37: return true; default: return false;  } }  return false; }), slice(input, tokPos, tokPos + 3)); 
            auto octal = octalmatch ? octalmatch[0] : "0"; 
            while (octal && parseInt(octal, 8) > 255)
                octal = slice(octal, 0, -1);
            if (octal=="0") {
octal = null;
}
            ++tokPos;
            if (octal.length() > 0) {
{
                if (strict) {
raise(tokPos - 2, "Octal literal in strict mode");
}
                out += fromCharCode(parseInt(octal, 8));
                tokPos += octal.length() - 1;
            }
} else {
                switch (ch) {
                    case 110:{
                        out += "\n";
                        break;}
                    case 114:{
                        out += "\r";
                        break;}
                    case 120:{
                        out += fromCharCode(readHexChar(2));
                        break;}
                    case 117:{
                        out += readCodePoint();
                        break;}
                    case 85:{
                        out += fromCharCode(readHexChar(8));
                        break;}
                    case 116:{
                        out += "\t";
                        break;}
                    case 98:{
                        out += "\b";
                        break;}
                    case 118:{
                        out += "\u000b";
                        break;}
                    case 102:{
                        out += "\f";
                        break;}
                    case 48:{
                        out += "\u0000";
                        break;}
                    case 13:{
                        if (charCodeAt(input, tokPos)==10) {
++tokPos;
}} // '\r\n'
                    case 10:{
                        break;}
                    default:{
                        out += fromCharCode(ch);
                        break;}
                }
            }
        }
} else {
            ++tokPos;
            if (test(newline, fromCharCode(ch))) {
{
                if (inTemplate) {
{
                    if (ch==13 && charCodeAt(input, tokPos)==10) {
{
                        ++tokPos;
                        ch = 10;
                    }
}
                    // if (options.locations) {
                    //   ++tokCurLine;
                    //   tokLineStart = tokPos;
                    // }
                }
} else {
                    raise(tokStart, "Unterminated string constant");
                }
            }
}
            out += fromCharCode(ch); // '\'
        }
    }
}

// Used to read character escape sequences ('\x', '\u', '\U').
int readHexChar(int len) {
    auto n = readInt(16, len); 
    if (ISNULL(n)) {
raise(tokStart, "Bad character escape sequence");
}
    return n;
}

// Used to signal to callers of `readWord1` whether the word
// contained any escape sequences. This is needed because words with
// escape sequences must not be interpreted as keywords.
auto containsEsc = 0; 

// Read an identifier, and return it as a string. Sets `containsEsc`
// to whether the word contained a '\u' escape.
//
// Only builds up the word character-by-character when it actually
// containeds an escape, as a micro-optimization.
std::string readWord1() {
    containsEsc = false;
    std::string word = std::string();  auto first = true;  auto start = tokPos; 
    ; for (; ;)
{
        auto ch = charCodeAt(input, tokPos); 
        if (isIdentifierChar(ch)) {
{
            if (containsEsc) {
word += charAt(input, tokPos);
}
            ++tokPos;
        }
} else if (ch==92) {
{
            if (!containsEsc) {
word = slice(input, start, tokPos);
}
            containsEsc = true;
            if (charCodeAt(input, ++tokPos) != 117) {
raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
}
            ++tokPos;
            auto esc = readHexChar(4); 
            auto escStr = fromCharCode(esc); 
            if (!escStr) {
raise(tokPos - 1, "Invalid Unicode escape");
}
            if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc))) {
raise(tokPos - 4, "Invalid Unicode escape");
}
            word += escStr;
        }
} else {
            break;
        }
        first = false;
    }
    return containsEsc ? word : slice(input, start, tokPos);
}

// Read an identifier or keyword token. Will check for reserved
// words when necessary.
int readWord() {
    std::string word = readWord1(); 
    keyword_t type = _name; 
    if (!containsEsc && isKeyword(word)) {
type = keywordTypes(word);
}
    return finishToken(type, word);
}

// ## Parser
// A recursive descent parser operates by defining functions for all
// syntactic elements, and recursively calling those, each function
// advancing the input stream and returning an AST node. Precedence
// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
// instead of `(!x)[1]` is handled by the fact that the parser
// function that parses unary prefix operators is called first, and
// in turn calls the function that parses `[]` subscripts — that
// way, it'll receive the node for `x[1]` already parsed, and wraps
// *that* in the unary opr node.
//
// Acorn uses an [opr precedence parser][opp] to handle binary
// opr precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser
// ### Parser utilities
// Continue to the next token.
auto next() {
    lastStart = tokStart;
    lastEnd = tokEnd;
    lastEndLoc = tokEndLoc;
    readToken();
}

// Enter strict mode. Re-reads the next token to please pedantic
// tests ("use strict"; 010; -- should fail).
auto setStrict(auto strct) {
    strict = strct;
    tokPos = tokStart;

    // if (options.locations) {
    //   while (tokPos < tokLineStart) {
    //     tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
    //     --tokCurLine;
    //   }
    // }
    skipSpace();
    readToken();
}

// Start an AST node, attaching a start offset.
// var SourceLocation = (function () {
    
//     return SourceLocation;
// })();
// ;

// var Node = (function () {
    
//     return Node;
// })();
// ;

Node* startNode() {
    auto node = new Node(); 

    // if (options.locations)
    //   node->loc = new SourceLocation();
    if (options.directSourceFile.length() > 0) {
node->sourceFile = options.directSourceFile;
}
    if (options.ranges) {
node->range = std::vector<int>({tokStart, 0});
}
    return node;
}

// Start a node whose start offset information should be based on
// the start of another node. For example, a binary opr node is
// only started after its left-hand side has already been parsed.
auto startNodeFrom(auto other) {
    auto node = new Node(); 
    node->start = other->start;

    // if (options.locations) {
    //   node->loc = new SourceLocation();
    //   node->loc->start = other->loc->start;
    // }
    if (options.ranges) {
node->range = std::vector<int>({other->range[0], 0});
}

    return node;
}

// Finish an AST node, adding `type` and `end` properties.
Node* finishNode(Node* node, std::string type) {
    node->type = type;
    node->end = lastEnd;

    // if (options.locations)
    //   node->loc->end = lastEndLoc;
    if (options.ranges) {
node->range[1] = lastEnd;
}
    return node;
}

// Test whether a statement node is the string literal `"use strict"`.


// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.
auto eat(keyword_t type) {
    if (tokType==type) {
{
        next();
        return true;
    }
} else {
        return false;
    }
}

// Test whether a semicolon can be inserted at the current position.
auto canInsertSemicolon() {
    return !options.strictSemicolons && (LOGICALOR(LOGICALOR(tokType==_eof,tokType==_braceR),test(newline, slice(input, lastEnd, tokStart))));
}

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.
auto semicolon() {
    if (!eat(_semi) && !canInsertSemicolon()) {
unexpected();
}
}

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.
auto expect(auto type) {
    LOGICALOR(eat(type),unexpected());
}

// Raise an unexpected token error.
bool unexpected(int pos) {
    raise(ISNOTNULL(pos) ? pos : tokStart, "Unexpected token");
}

// Checks if hash object has a property.


// Convert existing expression atom to assignable pattern
// if possible.


// Checks if node can be assignable spread argument.
auto checkSpreadAssign(auto node) {
    if (node->type!="Identifier" && node->type!="ArrayPattern") {
unexpected(node->start);
}
}

// Verify that argument names are not repeated, and it does not
// try to bind the words `eval` or `arguments`.


// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.
auto checkPropClash(auto prop, auto propHash) {
    if (prop->computed) {
return;
}
    auto key = prop->key;  auto name = 0; 
    switch (key->type) {
        case "Identifier":{
            name = key->name;
            break;}
        case "Literal":{
            name = String(key->value);
            break;}
        default:{
            return;}
    }
    std::string kind = LOGICALOR(prop->kind,"init");  auto other = 0; 
    if (has(propHash, name)) {
{
        // other = propHash[name];
        // var isGetSet = Number(kind !== "init");
        // if ((strict || isGetSet) && other[kind] || !(isGetSet ^ other->init))
        //   raise(key->start, "Redefinition of property");
    }
} else {
        // other = propHash[name] = {
        //   init: false,
        //   get: false,
        //   set: false
        // };
    }
    // other[kind] = true;
}

// Verify that a node is an lval — something that can be assigned
// to.


// ### Statement parsing
// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.
Node* parseTopLevel(Node* program) {
    lastStart = lastEnd = tokPos;

    // if (options.locations) lastEndLoc = Position;
    inFunction = inGenerator = strict = false;
    labels = std::vector<label_t>({});
    readToken();

    auto node = LOGICALOR(program,startNode());  auto first = true; 
    if (!program) {
node->bodylist = std::vector<Node*>({});
}
    while (tokType!=_eof) {
        auto stmt = parseStatement(); 
        push(node->bodylist, stmt);
        if (first && isUseStrict(stmt)) {
setStrict(true);
}
        first = false;
    }
    return finishNode(node, "Program");
}

label_t loopLabel = {kind: "loop"};  label_t switchLabel = {kind: "switch"}; 

// Parse a single statement.
//
// If expecting a statement and finding a slash opr, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo);`, where looking at the previous token
// does not help.
Node* parseStatement() {
    if (LOGICALOR(tokType==_slash,tokType==_assign && tokVal == "/=")) {
readToken(true);
}

    auto starttype = tokType;  auto node = startNode(); 

    switch (starttype._id) {
        case 7:{}
        case 10:{
            return parseBreakContinueStatement(node, starttype.keyword);}
        case 11:{
            return parseDebuggerStatement(node);}
        case 13:{
            return parseDoStatement(node);}
        case 16:{
            return parseForStatement(node);}
        case 17:{
            return parseFunctionStatement(node);}
        case 30:{
            return parseClass(node, true);}
        case 18:{
            return parseIfStatement(node);}
        case 19:{
            return parseReturnStatement(node);}
        case 20:{
            return parseSwitchStatement(node);}
        case 21:{
            return parseThrowStatement(node);}
        case 22:{
            return parseTryStatement(node);}
        case 23:{}
        case 24:{}
        case 25:{
            return parseVarStatement(node, starttype.keyword);}
        case 26:{
            return parseWhileStatement(node);}
        case 27:{
            return parseWithStatement(node);}
        case 41:{
            return parseBlock();}
        case 46:{
            return parseEmptyStatement(node);}
        case 32:{
            return parseExport(node);}
        case 33:{
            return parseImport(node);}

        default:{
            auto maybeName = tokVal;  auto expr = parseExpression(); 
            if (starttype==_name && expr->type=="Identifier" && eat(_colon)) {
return parseLabeledStatement(node, maybeName, expr);
} else return parseExpressionStatement(node, expr);}
    }
}

Node* parseBreakContinueStatement(Node* node, std::string keyword) {
    auto isBreak = keyword == "break"; 
    next();
    if (LOGICALOR(eat(_semi),canInsertSemicolon())) {
node->label = null;
} else if (tokType!=_name) {
unexpected();
} else {
        node->label = parseIdent();
        semicolon();
    }

    auto i = 0; ; for (; i < labels.size();)
{
        auto lab = labels[i]; 
        if (LOGICALOR(ISNULL(node->label),lab.name==node->label->name)) {
{
            if (ISNOTNULL(lab.kind) && (LOGICALOR(isBreak,lab.kind=="loop"))) {
break;
}
            if (node->label && isBreak) {
break;
}
        }
}
    }
    if (i==labels.size()) {
raise(node->start, std::string("Unsyntactic ") + keyword);
}
    return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
}

Node* parseDebuggerStatement(Node* node) {
    next();
    semicolon();
    return finishNode(node, "DebuggerStatement");
}

Node* parseDoStatement(Node* node) {
    next();
    push(labels, loopLabel);
    node->body = parseStatement();
    pop(labels);
    expect(_while);
    node->test = parseParenExpression();
    semicolon();
    return finishNode(node, "DoWhileStatement");
}

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` opr (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.
Node* parseForStatement(Node* node) {
    next();
    push(labels, loopLabel);
    expect(_parenL);
    if (tokType==_semi) {
return parseFor(node, null);
}
    if (LOGICALOR(tokType==_var,tokType==_let)) {
{
        auto init = startNode();  auto varKind = tokType.keyword;  auto isLet = tokType==_let; 
        next();
        parseVar(init, true, varKind);
        finishNode(init, "VariableDeclaration");

        // if ((tokType === _in || (tokType === _name && tokVal === "of")) && init->declarations.size() === 1 &&
        //     !(isLet && init->declarations[0].init))
        //   return parseForIn(node, init);
        return parseFor(node, init);
    }
}
    auto init = parseExpression(false, true); 
    if (LOGICALOR(tokType==_in,tokType==_name && tokVal=="of")) {
{
        // checkLVal(init);
        return parseForIn(node, init);
    }
}
    return parseFor(node, init);
}

Node* parseFunctionStatement(Node* node) {
    next();
    return parseFunction(node, true);
}

Node* parseIfStatement(Node* node) {
    next();
    node->test = parseParenExpression();
    node->consequent = parseStatement();
    node->alternate = eat(_else) ? parseStatement() : null;
    return finishNode(node, "IfStatement");
}

Node* parseReturnStatement(Node* node) {
    if (!inFunction && !options.allowReturnOutsideFunction) {
raise(tokStart, "'return' outside of function");
}
    next();

    // In `return` (and `break`/`continue`), the keywords with
    // optional arguments, we eagerly look for a semicolon or the
    // possibility to insert one.
    if (LOGICALOR(eat(_semi),canInsertSemicolon())) {
node->argument = null;
} else {
        node->argument = parseExpression();
        semicolon();
    }
    return finishNode(node, "ReturnStatement");
}

Node* parseSwitchStatement(Node* node) {
    next();
    node->discriminant = parseParenExpression();
    node->cases = std::vector<Node*>({});
    expect(_braceL);
    push(labels, switchLabel);

    Node* cur = nullptr;  auto sawDefault = 0; ; for (; tokType != _braceR;)
{
        if (LOGICALOR(tokType==_case,tokType==_default)) {
{
            auto isCase = tokType==_case; 
            if (cur) {
finishNode(cur, "SwitchCase");
}
            push(node->cases, cur = startNode());
            cur->consequents = std::vector<Node*>({});
            next();
            if (isCase) {
cur->test = parseExpression();
} else {
                if (sawDefault) {
raise(lastStart, "Multiple default clauses");
}
                sawDefault = true;
                cur->test = null;
            }
            expect(_colon);
        }
} else {
            if (!cur) {
unexpected();
}
            push(cur->consequents, parseStatement());
        }
    }
    if (cur) {
finishNode(cur, "SwitchCase");
}
    next(); // Closing brace
    pop(labels);
    return finishNode(node, "SwitchStatement");
}

Node* parseThrowStatement(Node* node) {
    next();
    if (test(newline, slice(input, lastEnd, tokStart))) {
raise(lastEnd, "Illegal newline after throw");
}
    node->argument = parseExpression();
    semicolon();
    return finishNode(node, "ThrowStatement");
}

Node* parseTryStatement(Node* node) {
    next();
    node->block = parseBlock();
    node->handler = null;
    if (tokType==_catch) {
{
        auto clause = startNode(); 
        next();
        expect(_parenL);
        clause->param = parseIdent();
        if (strict && isStrictBadIdWord(clause->param->name)) {
raise(clause->param->start, std::string("Binding ") + clause->param->name + std::string(" in strict mode"));
}
        expect(_parenR);
        clause->guard = null;
        clause->body = parseBlock();
        node->handler = finishNode(clause, "CatchClause");
    }
}
    node->guardedHandlers = empty;
    node->finalizer = eat(_finally) ? parseBlock() : null;
    if (!node->handler && !node->finalizer) {
raise(node->start, "Missing catch or finally clause");
}
    return finishNode(node, "TryStatement");
}

Node* parseVarStatement(Node* node, std::string kind) {
    next();
    parseVar(node, false, kind);
    semicolon();
    return finishNode(node, "VariableDeclaration");
}

Node* parseWhileStatement(Node* node) {
    next();
    node->test = parseParenExpression();
    push(labels, loopLabel);
    node->body = parseStatement();
    pop(labels);
    return finishNode(node, "WhileStatement");
}

Node* parseWithStatement(Node* node) {
    if (strict) {
raise(tokStart, "'with' in strict mode");
}
    next();
    node->object = parseParenExpression();
    node->body = parseStatement();
    return finishNode(node, "WithStatement");
}

Node* parseEmptyStatement(Node* node) {
    next();
    return finishNode(node, "EmptyStatement");
}

Node* parseLabeledStatement(Node* node, std::string maybeName, Node* expr) {
    auto i = 0; ; for (; i < labels.size();)
if (labels[i].name==maybeName) {
raise(expr->start, std::string("Label '") + maybeName + std::string("' is already declared"));
}
    std::string kind = tokType.isLoop ? "loop" : tokType==_switch ? "switch" : null; 
    push(labels, (label_t){kind: kind, name: maybeName});
    node->body = parseStatement();
    pop(labels);
    node->label = expr;
    return finishNode(node, "LabeledStatement");
}

Node* parseExpressionStatement(Node* node, Node* expr) {
    node->expression = expr;
    semicolon();
    return finishNode(node, "ExpressionStatement");
}

// Used for constructs like `switch` and `if` that insist on
// parentheses around their expression.
Node* parseParenExpression() {
    expect(_parenL);
    Node* val = parseExpression(); 
    expect(_parenR);
    return val;
}

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).
Node* parseBlock(bool allowStrict) {
    auto node = startNode();  auto first = true;  auto strict = false;  auto oldStrict = 0; 
    node->bodylist = std::vector<Node*>({});
    expect(_braceL);
    while (!eat(_braceR)) {
        auto stmt = parseStatement(); 
        push(node->bodylist, stmt);
        if (first && allowStrict && isUseStrict(stmt)) {
{
            oldStrict = strict;
            setStrict(strict = true);
        }
}
        first = false;
    }
    if (strict && !oldStrict) {
setStrict(false);
}
    return finishNode(node, "BlockStatement");
}

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.
Node* parseFor(Node* node, Node* init) {
    node->init = init;
    expect(_semi);
    node->test = tokType==_semi ? null : parseExpression();
    expect(_semi);
    node->update = tokType==_parenR ? null : parseExpression();
    expect(_parenR);
    node->body = parseStatement();
    pop(labels);
    return finishNode(node, "ForStatement");
}

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.
Node* parseForIn(Node* node, Node* init) {
    auto exprtype = tokType==_in ? "ForInStatement" : "ForOfStatement"; 
    next();
    node->left = init;
    node->right = parseExpression();
    expect(_parenR);
    node->body = parseStatement();
    pop(labels);
    return finishNode(node, exprtype);
}

// Parse a list of variable declarations.
Node* parseVar(Node* node, bool noIn, std::string kind) {
    node->declarations = std::vector<Node*>({});
    node->kind = kind;
    ; for (; ;)
{
        auto decl = startNode(); 
        decl->id = options.ecmaVersion >= 6 ? toAssignable(parseExprAtom()) : parseIdent();

        // checkLVal(decl->id, true);
        if (eat(_eq)) {
{
            decl->init = parseExpression(true, noIn);
        }
} else if (kind==_const.keyword) {
{
            unexpected();
        }
} else {
            decl->init = null;
        }
        push(node->declarations, finishNode(decl, "VariableDeclarator"));
        if (!eat(_comma)) {
break;
}
    }
    return node;
}

// ### Expression parsing
// These nest, from the most general expression type at the top to
// 'atomic', nondivisible expression types at the bottom. Most of
// the functions will simply let the function(s) below them parse,
// and, *if* the syntactic construct they handle is present, wrap
// the AST node that the inner parser gave them in another node.
// Parse a full expression. The arguments are used to forbid comma
// sequences (in argument lists, array literals, or object literals)
// or the `in` opr (in for loops initalization expressions).
Node* parseExpression(bool noComma, bool noIn) {
    auto expr = parseMaybeAssign(noIn); 
    if (!noComma && tokType==_comma) {
{
        auto node = startNodeFrom(expr); 
        node->expressions = std::vector<Node*>({expr});
        while (eat(_comma))
            push(node->expressions, parseMaybeAssign(noIn));
        return finishNode(node, "SequenceExpression");
    }
}
    return expr;
}

// Parse an assignment expression. This includes applications of
// operators like `+=`.
Node* parseMaybeAssign(bool noIn) {
    auto left = parseMaybeConditional(noIn); 
    if (tokType.isAssign) {
{
        auto node = startNodeFrom(left); 
        node->opr = tokVal;
        node->left = tokType==_eq ? toAssignable(left) : left;

        // checkLVal(left);
        next();
        node->right = parseMaybeAssign(noIn);
        return finishNode(node, "AssignmentExpression");
    }
}
    return left;
}

// Parse a ternary conditional (`?:`) opr.
Node* parseMaybeConditional(bool noIn) {
    auto expr = parseExprOps(noIn); 
    if (eat(_question)) {
{
        auto node = startNodeFrom(expr); 
        node->test = expr;
        node->consequent = parseExpression(true);
        expect(_colon);
        node->alternate = parseExpression(true, noIn);
        return finishNode(node, "ConditionalExpression");
    }
}
    return expr;
}

// Start the precedence parser.
Node* parseExprOps(bool noIn) {
    return parseExprOp(parseMaybeUnary(), -1, noIn);
}

// Parse binary operators with the opr precedence parsing
// algorithm. `left` is the left-hand side of the opr.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// opr that has a lower precedence than the set it is parsing.
Node* parseExprOp(Node* left, double minPrec, bool noIn) {
    auto prec = tokType.binop; 
    if (ISNOTNULL(prec) && (LOGICALOR(!noIn,tokType!=_in))) {
{
        if (prec > minPrec) {
{
            auto node = startNodeFrom(left); 
            node->left = left;
            node->opr = tokVal;
            auto op = tokType; 
            next();
            node->right = parseExprOp(parseMaybeUnary(), prec, noIn);
            auto exprNode = finishNode(node, (LOGICALOR(op==_logicalOR,op==_logicalAND)) ? "LogicalExpression" : "BinaryExpression"); 
            return parseExprOp(exprNode, minPrec, noIn);
        }
}
    }
}
    return left;
}

// Parse unary operators, both prefix and postfix.
Node* parseMaybeUnary() {
    if (tokType.prefix) {
{
        auto node = startNode();  auto update = tokType.isUpdate; 
        node->opr = tokVal;
        node->prefix = true;
        tokRegexpAllowed = true;
        next();
        node->argument = parseMaybeUnary();

        // if (update) checkLVal(node->argument);
        // else
        if (strict && node->opr=="delete" && node->argument->type=="Identifier") {
raise(node->start, "Deleting local variable in strict mode");
}
        return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
    }
}
    auto expr = parseExprSubscripts(); 
    while (tokType.postfix && !canInsertSemicolon()) {
        auto node = startNodeFrom(expr); 
        node->opr = tokVal;
        node->prefix = false;
        node->argument = expr;

        // checkLVal(expr);
        next();
        expr = finishNode(node, "UpdateExpression");
    }
    return expr;
}

// Parse call, dot, and `[]`-subscript expressions.
Node* parseExprSubscripts() {
    return parseSubscripts(parseExprAtom());
}

Node* parseSubscripts(Node* base, bool noCalls) {
    if (eat(_dot)) {
{
        auto node = startNodeFrom(base); 
        node->object = base;
        node->property = parseIdent(true);
        node->computed = false;
        return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    }
} else if (eat(_bracketL)) {
{
        auto node = startNodeFrom(base); 
        node->object = base;
        node->property = parseExpression();
        node->computed = true;
        expect(_bracketR);
        return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    }
} else if (!noCalls && eat(_parenL)) {
{
        auto node = startNodeFrom(base); 
        node->callee = base;
        node->arguments = parseExprList(_parenR, false);
        return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
    }
} else if (tokType==_bquote) {
{
        auto node = startNodeFrom(base); 
        node->tag = base;
        node->quasi = parseTemplate();
        return parseSubscripts(finishNode(node, "TaggedTemplateExpression"), noCalls);
    }
}
    return base;
}

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.
Node* parseExprAtom() {
    switch (tokType._id) {
        case 29:{
            auto node = startNode(); 
            next();
            return finishNode(node, "ThisExpression");}

        case 34:{
            if (inGenerator) {
return parseYield();
}}

        case 5:{
            Node* id = parseIdent(tokType!=_name); 
            if (eat(_arrow)) {
{
                return parseArrowExpression(startNodeFrom(id), std::vector<Node*>({id}));
            }
}
            return id;}

        case 2:{}
        case 4:{}
        case 3:{
            auto node = startNode(); 
            
            node->raw = slice(input, tokStart, tokEnd);
            next();
            return finishNode(node, "Literal");}

        case 35:{}
        case 36:{}
        case 37:{
            auto node = startNode(); 

            // node->value = tokType.atomValue;
            node->raw = tokType.keyword;
            next();
            return finishNode(node, "Literal");}

        case 43:{
            int tokStartLoc1 = tokStartLoc;  auto tokStart1 = tokStart;  Node* val = 0;  std::vector<Node*> exprList = std::vector<Node*>(); 
            next();

            // check whether this is generator comprehension or regular expression
            if (options.ecmaVersion >= 6 && tokType==_for) {
{
                val = parseComprehension(startNode(), true);
            }
} else {
                auto oldParenL = ++metParenL; 
                if (tokType!=_parenR) {
{
                    val = parseExpression();
                    exprList = val->type=="SequenceExpression" ? val->expressions : std::vector<Node*>({val});
                }
} else {
                    exprList = std::vector<Node*>({});
                }
                expect(_parenR);

                // if '=>' follows '(...)', convert contents to arguments
                if (metParenL==oldParenL && eat(_arrow)) {
{
                    val = parseArrowExpression(startNode(), exprList);
                }
} else {
                    // forbid '()' before everything but '=>'
                    if (!val) {
unexpected(lastStart);
}

                    // forbid '...' in sequence expressions
                    if (options.ecmaVersion >= 6) {
{
                        auto i = 0; ; for (; i < exprList.size();)
{
                            if (exprList[i]->type=="SpreadElement") {
unexpected();
}
                        }
                    }
}
                }
            }
            val->start = tokStart1;
            val->end = lastEnd;

            // if (options.locations) {
            //   val->loc->start = tokStartLoc1;
            //   val->loc->end = lastEndLoc;
            // }
            if (options.ranges) {
{
                val->range = std::vector<int>({tokStart1, lastEnd});
            }
}
            return val;}

        case 39:{
            auto node = startNode(); 
            next();

            // check whether this is array comprehension or regular array
            if (options.ecmaVersion >= 6 && tokType==_for) {
{
                return parseComprehension(node, false);
            }
}
            node->elements = parseExprList(_bracketR, true, true);
            return finishNode(node, "ArrayExpression");}

        case 41:{
            return parseObj();}

        case 17:{
            auto node = startNode(); 
            next();
            return parseFunction(node, false);}

        case 30:{
            return parseClass(startNode(), false);}

        case 28:{
            return parseNew();}

        case 49:{
            return parseSpread();}

        case 52:{
            return parseTemplate();}

        default:{
            unexpected();}
    }
}

// New's precedence is slightly tricky. It must allow its argument
// to be a `[]` or dot subscript expression, but not a call — at
// least, not without wrapping it in parentheses. Thus, it uses the
Node* parseNew() {
    auto node = startNode(); 
    next();
    node->callee = parseSubscripts(parseExprAtom(), true);
    if (eat(_parenL)) {
node->arguments = parseExprList(_parenR, false);
} else node->arguments = empty;
    return finishNode(node, "NewExpression");
}

// Parse spread element '...expr'
Node* parseSpread() {
    auto node = startNode(); 
    next();
    node->argument = parseExpression(true);
    return finishNode(node, "SpreadElement");
}

// Parse template expression.
Node* parseTemplate() {
    auto node = startNode(); 

    /*
    node->expressions = [];
    node->quasis = [];
    inTemplate = true;
    next();
    for (;;) {
    var elem = startNode();
    elem->value = {cooked: tokVal, raw: input.slice(tokStart, tokEnd)};
    elem->tail = false;
    next();
    node->quasis.push(finishNode(elem, "TemplateElement"));
    if (eat(_bquote)) { // '`', end of template
    elem->tail = true;
    break;
    }
    inTemplate = false;
    expect(_dollarBraceL);
    node->expressions.push(parseExpression());
    inTemplate = true;
    expect(_braceR);
    }
    inTemplate = false;
    */
    return finishNode(node, "TemplateLiteral");
}

// Parse an object literal.
Node* parseObj() {
    auto node = startNode();  auto first = true; 
    node->properties = std::vector<Node*>({});
    next();
    while (!eat(_braceR)) {
        if (!first) {
{
            expect(_comma);
            if (options.allowTrailingCommas && eat(_braceR)) {
break;
}
        }
} else first = false;

        Node* prop = startNode();  std::string kind = std::string();  auto isGenerator = 0; 
        if (options.ecmaVersion >= 6) {
{
            prop->method = false;
            prop->shorthand = false;
            isGenerator = eat(_star);
        }
}
        parsePropertyName(prop);
        if (eat(_colon)) {
{
            prop->value = parseExpression(true);
            kind = prop->kind = "init";
        }
} else if (options.ecmaVersion >= 6 && tokType==_parenL) {
{
            kind = prop->kind = "init";
            prop->method = true;
            prop->value = parseMethod(isGenerator);
        }
} else if (options.ecmaVersion >= 5 && !prop->computed && prop->key->type=="Identifier" && (LOGICALOR(prop->key->name=="get",prop->key->name=="set"))) {
{
            if (isGenerator) {
unexpected();
}
            kind = prop->kind = prop->key->name;
            parsePropertyName(prop);
            prop->value = parseMethod(false);
        }
} else if (options.ecmaVersion >= 6 && !prop->computed && prop->key->type=="Identifier") {
{
            kind = prop->kind = "init";
            prop->value = prop->key;
            prop->shorthand = true;
        }
} else unexpected();

        // checkPropClash(prop, propHash);
        push(node->properties, finishNode(prop, "Property"));
    }
    return finishNode(node, "ObjectExpression");
}

void parsePropertyName(Node* prop) {
    if (options.ecmaVersion >= 6) {
{
        if (eat(_bracketL)) {
{
            prop->computed = true;
            prop->key = parseExpression();
            expect(_bracketR);
            return;
        }
} else {
            prop->computed = false;
        }
    }
}
    prop->key = (LOGICALOR(tokType==_num,tokType==_string)) ? parseExprAtom() : parseIdent(true);
}

// Initialize empty function node.
auto initFunction(auto node) {
    node->id = null;
    node->params = std::vector<Node*>({});
    if (options.ecmaVersion >= 6) {
{
        node->defaults = std::vector<Node*>({});
        node->rest = null;
        node->generator = false;
    }
}
}

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).
Node* parseFunction(Node* node, bool isStatement, bool allowExpressionBody) {
    initFunction(node);
    if (options.ecmaVersion >= 6) {
{
        node->generator = eat(_star);
    }
}
    if (LOGICALOR(isStatement,tokType==_name)) {
{
        node->id = parseIdent();
    }
}
    parseFunctionParams(node);
    parseFunctionBody(node, allowExpressionBody);
    return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
}

// Parse object or class method.
Node* parseMethod(bool isGenerator) {
    auto node = startNode(); 
    initFunction(node);
    parseFunctionParams(node);
    auto allowExpressionBody = 0; 
    if (options.ecmaVersion >= 6) {
{
        node->generator = isGenerator;
        allowExpressionBody = true;
    }
} else {
        allowExpressionBody = false;
    }
    parseFunctionBody(node, allowExpressionBody);
    return finishNode(node, "FunctionExpression");
}

// Parse arrow function expression with given parameters.
Node* parseArrowExpression(Node* node, std::vector<Node*> params) {
    initFunction(node);

    auto defaults = node->defaults;  auto hasDefaults = false; 

    auto i = 0;  auto lastI = params.size() - 1; ; for (; i <= lastI;)
{
        auto param = params[i]; 

        if (param->type=="AssignmentExpression" && param->opr=="=") {
{
            hasDefaults = true;
            params[i] = param->left;
            push(defaults, param->right);
        }
} else {
            toAssignable(param, i==lastI, true);
            push(defaults, null);
            if (param->type=="SpreadElement") {
{
                pop(params);
                node->rest = param->argument;
                break;
            }
}
        }
    }

    node->params = params;
    if (!hasDefaults) {
node->defaults = std::vector<Node*>({});
}

    parseFunctionBody(node, true);
    return finishNode(node, "ArrowFunctionExpression");
}

// Parse function parameters.
Node* parseFunctionParams(Node* node) {
    auto defaults = std::vector<Node*>({});  auto hasDefaults = false; 

    expect(_parenL);
    ; for (; ;)
{
        if (eat(_parenR)) {
{
            break;
        }
} else if (options.ecmaVersion >= 6 && eat(_ellipsis)) {
{
            node->rest = toAssignable(parseExprAtom(), false, true);
            checkSpreadAssign(node->rest);
            expect(_parenR);
            break;
        }
} else {
            push(node->params, options.ecmaVersion >= 6 ? toAssignable(parseExprAtom(), false, true) : parseIdent());
            if (options.ecmaVersion >= 6 && tokType==_eq) {
{
                next();
                hasDefaults = true;
                push(defaults, parseExpression(true));
            }
}
            if (!eat(_comma)) {
{
                expect(_parenR);
                break;
            }
}
        }
    }

    if (hasDefaults) {
node->defaults = defaults;
}
}

// Parse function body and check parameters.
Node* parseFunctionBody(Node* node, bool allowExpression) {
    auto isExpression = allowExpression && tokType!=_braceL; 

    if (isExpression) {
{
        node->body = parseExpression(true);
        // node->expression = true;
    }
} else {
        // Start a new scope with regard to labels and the `inFunction`
        // flag (restore them to their old value afterwards).
        auto oldInFunc = inFunction;  auto oldInGen = inGenerator;  auto oldLabels = labels; 
        inFunction = true;
        inGenerator = node->generator;
        labels = std::vector<label_t>({});
        node->body = parseBlock(true);

        // node->expression = false;
        inFunction = oldInFunc;
        inGenerator = oldInGen;
        labels = oldLabels;
    }

    // If this is a strict mode function, verify that argument names
    // are not repeated, and it does not try to bind the words `eval`
    // or `arguments`.
    if (LOGICALOR(strict,!isExpression && node->body->bodylist.size() && isUseStrict(node->body->bodylist[0]))) {
{
        // var nameHash = {};
        // if (node->id)
        //   checkFunctionParam(node->id, nameHash);
        // for (var i = 0; i < node->params.size(); i++)
        //   checkFunctionParam(node->params[i], nameHash);
        // if (node->rest)
        //   checkFunctionParam(node->rest, nameHash);
    }
}
}

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).
Node* parseClass(Node* node, bool isStatement) {
    next();
    if (tokType==_name) {
{
        node->id = parseIdent();
    }
} else if (isStatement) {
{
        unexpected();
    }
} else {
        node->id = null;
    }
    node->superClass = eat(_extends) ? parseExpression() : null;
    auto classBody = startNode(); 
    classBody->bodylist = std::vector<Node*>({});
    expect(_braceL);
    while (!eat(_braceR)) {
        auto method = startNode(); 
        if (tokType==_name && tokVal=="static") {
{
            next();
            method->_static = true;
        }
} else {
            method->_static = false;
        }
        auto isGenerator = eat(_star); 
        parsePropertyName(method);
        if (tokType==_name && !method->computed && method->key->type=="Identifier" && (LOGICALOR(method->key->name=="get",method->key->name=="set"))) {
{
            if (isGenerator) {
unexpected();
}
            method->kind = method->key->name;
            parsePropertyName(method);
        }
} else {
            method->kind = "";
        }
        method->value = parseMethod(isGenerator);

        // checkPropClash(method, method->_static ? staticMethodHash : methodHash);
        push(classBody->bodylist, finishNode(method, "MethodDefinition"));
        eat(_semi);
    }
    node->body = finishNode(classBody, "ClassBody");
    return finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
}

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).
std::vector<Node*> parseExprList(keyword_t close, bool allowTrailingComma, bool allowEmpty) {
    auto elts = std::vector<Node*>({});  auto first = true; 
    while (!eat(close)) {
        if (!first) {
{
            expect(_comma);
            if (allowTrailingComma && options.allowTrailingCommas && eat(close)) {
break;
}
        }
} else first = false;

        if (allowEmpty && tokType==_comma) {
push(elts, null);
} else push(elts, parseExpression(true));
    }
    return elts;
}

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.
Node* parseIdent(bool liberal) {
    auto node = startNode(); 
    if (liberal && options.forbidReserved == "everywhere") {
liberal = false;
}
    if (tokType==_name) {
{
        if (!liberal && (LOGICALOR(options.forbidReserved && (options.ecmaVersion==3 ? isReservedWord3 : isReservedWord5)(tokVal),strict && isStrictReservedWord(tokVal))) && indexOf(slice(input, tokStart, tokEnd), "\\") == -1) {
raise(tokStart, std::string("The keyword '") + tokVal + std::string("' is reserved"));
}
        node->name = tokVal;
    }
} else if (liberal && tokType.keyword) {
{
        node->name = tokType.keyword;
    }
} else {
        unexpected();
    }
    tokRegexpAllowed = false;
    next();
    return finishNode(node, "Identifier");
}

// Parses module export declaration.
Node* parseExport(Node* node) {
    next();

    // export var|const|let|function|class ...;
    if (LOGICALOR(LOGICALOR(LOGICALOR(LOGICALOR(tokType==_var,tokType==_const),tokType==_let),tokType==_function),tokType==_class)) {
{
        node->declaration = parseStatement();
        node->_default = false;
        node->specifiers = std::vector<Node*>({});
        node->source = null;
    }
} else if (eat(_default)) {
{
        node->declaration = parseExpression(true);
        node->_default = true;
        node->specifiers = std::vector<Node*>({});
        node->source = null;
        semicolon();
    }
} else {
        // export * from '...'
        // export { x, y as z } [from '...']
        auto isBatch = tokType==_star; 
        node->declaration = null;
        node->_default = false;
        node->specifiers = parseExportSpecifiers();
        if (tokType==_name && tokVal=="from") {
{
            next();
            if (tokType!=_string) {
{
                unexpected();
            }
}
            node->source = parseExprAtom();
        }
} else {
            if (isBatch) {
unexpected();
}
            node->source = null;
        }
    }
    return finishNode(node, "ExportDeclaration");
}

// Parses a comma-separated list of module exports.
std::vector<Node*> parseExportSpecifiers() {
    auto nodes = std::vector<Node*>({});  auto first = true; 
    if (tokType==_star) {
{
        // export * from '...'
        auto node = startNode(); 
        next();
        push(nodes, finishNode(node, "ExportBatchSpecifier"));
    }
} else {
        // export { x, y as z } [from '...']
        expect(_braceL);
        while (!eat(_braceR)) {
            if (!first) {
{
                expect(_comma);
                if (options.allowTrailingCommas && eat(_braceR)) {
break;
}
            }
} else first = false;

            auto node = startNode(); 
            node->id = parseIdent();
            if (tokType==_name && tokVal=="as") {
{
                next();
                // node->name = parseIdent(true);
            }
} else {
                node->name = null;
            }
            push(nodes, finishNode(node, "ExportSpecifier"));
        }
    }
    return nodes;
}

// Parses import declaration.
Node* parseImport(Node* node) {
    next();

    // import '...';
    if (tokType==_string) {
{
        node->specifiers = std::vector<Node*>({});
        node->source = parseExprAtom();
        node->kind = "";
    }
} else {
        node->specifiers = parseImportSpecifiers();
        if (LOGICALOR(tokType!=_name,tokVal!="from")) {
unexpected();
}
        next();
        if (tokType!=_string) {
{
            unexpected();
        }
}
        node->source = parseExprAtom();

        // only for backward compatibility with Esprima's AST
        // (it doesn't support mixed default + named yet)
        node->kind = node->specifiers[0]->_default ? "default" : "named";
    }
    return finishNode(node, "ImportDeclaration");
}

// Parses a comma-separated list of module imports.
std::vector<Node*> parseImportSpecifiers() {
    auto nodes = std::vector<Node*>({});  auto first = true; 
    if (tokType==_star) {
{
        auto node = startNode(); 
        next();
        if (LOGICALOR(tokType!=_name,tokVal!="as")) {
unexpected();
}
        next();

        // node->name = parseIdent();
        // checkLVal(node->name, true);
        push(nodes, finishNode(node, "ImportBatchSpecifier"));
        return nodes;
    }
}
    if (tokType==_name) {
{
        // import defaultObj, { x, y as z } from '...'
        auto node = startNode(); 
        node->id = parseIdent();

        // checkLVal(node->id, true);
        node->name = null;
        node->_default = true;
        push(nodes, finishNode(node, "ImportSpecifier"));
        if (!eat(_comma)) {
return nodes;
}
    }
}
    expect(_braceL);
    while (!eat(_braceR)) {
        if (!first) {
{
            expect(_comma);
            if (options.allowTrailingCommas && eat(_braceR)) {
break;
}
        }
} else first = false;

        auto node = startNode(); 
        node->id = parseIdent(true);
        if (tokType==_name && tokVal=="as") {
{
            next();
            // node->name = parseIdent();
        }
} else {
            node->name = null;
        }

        // checkLVal(node->name || node->id, true);
        node->_default = false;
        push(nodes, finishNode(node, "ImportSpecifier"));
    }
    return nodes;
}

// Parses yield expression inside generator.
Node* parseYield() {
    auto node = startNode(); 
    next();
    if (LOGICALOR(eat(_semi),canInsertSemicolon())) {
{
        node->delegate = false;
        node->argument = null;
    }
} else {
        node->delegate = eat(_star);
        node->argument = parseExpression(true);
    }
    return finishNode(node, "YieldExpression");
}

// Parses array and generator comprehensions.
Node* parseComprehension(Node* node, bool isGenerator) {
    node->blocks = std::vector<Node*>({});
    while (tokType==_for) {
        auto block = startNode(); 
        next();
        expect(_parenL);
        block->left = toAssignable(parseExprAtom());

        // checkLVal(block->left, true);
        if (LOGICALOR(tokType!=_name,tokVal!="of")) {
unexpected();
}
        next();

        // `of` property is here for compatibility with Esprima's AST
        // which also supports deprecated [for (... in ...) expr]
        block->of = true;
        block->right = parseExpression();
        expect(_parenR);
        push(node->blocks, finishNode(block, "ComprehensionBlock"));
    }
    node->filter = eat(_if) ? parseParenExpression() : null;
    node->body = parseExpression();
    expect(isGenerator ? _parenR : _bracketR);
    node->generator = isGenerator;
    return finishNode(node, "ComprehensionExpression");
}

// Exports.
// var api = {
//     version: version,
//     defaultOptions: defaultOptions,
//     getLineInfo: getLineInfo,
//     tokenize: tokenize,
//     keywordTypes: keywordTypes,
//     tokTypes: tokTypes,
//     SourceLocation: SourceLocation,
//     Position: Position,
//     Node: Node,
//     isIdentifierStart: isIdentifierStart,
//     isIdentifierChar: isIdentifierChar
// };

// module.exports = api;
