#include "out-inc.h"































  // The main exported interface (under `self.acorn` when in the
  // browser) is a `parse` function that takes a code string and
  // returns an abstract syntax tree as specified by [Mozilla parser
  // API][api], with the caveat that the SpiderMonkey-specific syntax
  // (`let`, `yield`, inline XML, etc) is not recognized.
  //
  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

  options_t options = {};  auto input = std::string("");  auto inputLen = 0;  std::string sourceFile = ""; 

  auto parse  (auto inpt, auto opts) {
    input = String(inpt); inputLen = input.length();
    setOptions(opts);
    initTokenState();
    return parseTopLevel(options.program);
  };

  // A second optional argument can be given to further configure
  // the parser process. These options are recognized:

  options_t defaultOptions  = {ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: false, allowReturnOutsideFunction: false, locations: false, onComment: null, ranges: false, program: null, sourceFile: null, directSourceFile: null}; 








  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.













  // Acorn is organized as a tokenizer and a recursive-descent parser.
  // The `tokenize` export provides an interface to the tokenizer.
  // Because the tokenizer is optimized for being efficiently used by
  // the Acorn parser itself, this interface is somewhat crude and not
  // very modular. Performing another parse or call to `tokenize` will
  // reset the internal state, and invalidate existing tokenizers.
































  // State is kept in (closure-)global variables. We already saw the
  // `options`, `input`, and `inputLen` variables above.

  // The current position of the tokenizer in the input.

  auto tokPos = 0; 

  // The start and end offsets of the current token.

  int tokStart = 0;  int tokEnd = 0; 

  // When `options.locations` is true, these hold objects
  // containing the tokens start and end line/column pairs.

  int tokStartLoc = 0;  auto tokEndLoc = 0; 

  // The type and value of the current token. Token types are objects,
  // named by variables against which they can be compared, and
  // holding properties that describe them (indicating, for example,
  // the precedence of an infix opr, and the original name of a
  // keyword token). The kind of value that's held in `tokVal` depends
  // on the type of the token. For literals, it is the literal value,
  // for operators, the opr name, and so on.

  keyword_t tokType = { };  auto tokVal = 0; 

  // Interal state for the tokenizer. To distinguish between division
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

  // This is the parser's state. `inFunction` is used to reject
  // `return` statements outside of functions, `labels` to verify that
  // `break` and `continue` have somewhere to jump to, and `strict`
  // indicates whether strict mode is on.

  auto inFunction = 0;  auto labels = std::vector<label_t>();  auto strict = 0; 

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.









  // Reused empty array added for node fields that are always empty.

  auto empty = std::vector<node_t*>(); 

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // These are the general types. The `type` property is only used to
  // make them recognizeable when debugging.

  struct keyword_t _num = {_id: 1, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "num"};  struct keyword_t _regexp = {_id: 2, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "regexp"};  struct keyword_t _string = {_id: 3, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "string"}; 
  struct keyword_t _name = {_id: 4, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "name"};  struct keyword_t _eof = {_id: 5, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "eof"}; 

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

  struct keyword_t _break = {_id: 6, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "break", postfix: false, prefix: false, type: ""};  struct keyword_t _case = {_id: 7, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "case", postfix: false, prefix: false, type: ""};  struct keyword_t _catch = {_id: 8, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "catch", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _continue = {_id: 9, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "continue", postfix: false, prefix: false, type: ""};  struct keyword_t _debugger = {_id: 10, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "debugger", postfix: false, prefix: false, type: ""};  struct keyword_t _default = {_id: 11, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "default", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _do = {_id: 12, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "do", postfix: false, prefix: false, type: ""};  struct keyword_t _else = {_id: 13, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "else", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _finally = {_id: 14, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "finally", postfix: false, prefix: false, type: ""};  struct keyword_t _for = {_id: 15, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "for", postfix: false, prefix: false, type: ""};  struct keyword_t _function = {_id: 16, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "function", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _if = {_id: 17, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "if", postfix: false, prefix: false, type: ""};  struct keyword_t _return = {_id: 18, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "return", postfix: false, prefix: false, type: ""};  struct keyword_t _switch = {_id: 19, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "switch", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _throw = {_id: 20, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "throw", postfix: false, prefix: false, type: ""};  struct keyword_t _try = {_id: 21, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "try", postfix: false, prefix: false, type: ""};  struct keyword_t _var = {_id: 22, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "var", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _while = {_id: 23, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "while", postfix: false, prefix: false, type: ""};  struct keyword_t _with = {_id: 24, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "with", postfix: false, prefix: false, type: ""};  struct keyword_t _new = {_id: 25, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "new", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _this = {_id: 26, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "this", postfix: false, prefix: false, type: ""}; 

  // The keywords that denote values.

  struct keyword_t _null = {_id: 27, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "null", postfix: false, prefix: false, type: ""};  struct keyword_t _true = {_id: 28, atomValue: ATOM_TRUE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "true", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _false = {_id: 29, atomValue: ATOM_FALSE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "false", postfix: false, prefix: false, type: ""}; 

  // Some keywords are treated as regular operators. `in` sometimes
  // (when parsing `for`) needs to be tested against specifically, so
  // we assign a variable name to it for quick comparing.

  struct keyword_t _in = {_id: 30, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "in", postfix: false, prefix: false, type: ""}; 

  // Map keyword names to token types.












  // Punctuation token types. Again, the `type` property is purely for debugging.

  struct keyword_t _bracketL = {_id: 31, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "["};  struct keyword_t _bracketR = {_id: 32, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "]"};  struct keyword_t _braceL = {_id: 33, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "{"}; 
  struct keyword_t _braceR = {_id: 34, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "}"};  struct keyword_t _parenL = {_id: 35, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "("};  struct keyword_t _parenR = {_id: 36, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ")"}; 
  struct keyword_t _comma = {_id: 37, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ","};  struct keyword_t _semi = {_id: 38, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ";"}; 
  struct keyword_t _colon = {_id: 39, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ":"};  struct keyword_t _dot = {_id: 40, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "."};  struct keyword_t _question = {_id: 41, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "?"}; 

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

  struct keyword_t _slash = {_id: 42, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};  struct keyword_t _eq = {_id: 43, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _assign = {_id: 44, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _incDec = {_id: 45, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: true, keyword: "", postfix: true, prefix: true, type: ""};  struct keyword_t _prefix = {_id: 46, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""}; 
  struct keyword_t _logicalOR = {_id: 47, atomValue: ATOM_NULL, beforeExpr: true, binop: 1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _logicalAND = {_id: 48, atomValue: ATOM_NULL, beforeExpr: true, binop: 2, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _bitwiseOR = {_id: 49, atomValue: ATOM_NULL, beforeExpr: true, binop: 3, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _bitwiseXOR = {_id: 50, atomValue: ATOM_NULL, beforeExpr: true, binop: 4, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _bitwiseAND = {_id: 51, atomValue: ATOM_NULL, beforeExpr: true, binop: 5, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _equality = {_id: 52, atomValue: ATOM_NULL, beforeExpr: true, binop: 6, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _relational = {_id: 53, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _bitShift = {_id: 54, atomValue: ATOM_NULL, beforeExpr: true, binop: 8, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 
  struct keyword_t _plusMin = {_id: 55, atomValue: ATOM_NULL, beforeExpr: true, binop: 9, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""}; 
  struct keyword_t _multiplyModulo = {_id: 56, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}; 

  // Provide access to the token types for external users of the
  // tokenizer.









  // predicate containing a big ugly `switch` statement is faster than
  // a regular expression, and on Chrome the two are about on par.
  // This function uses `eval` (non-lexical) to produce such a
  // predicate from a space-separated string of words.
  //
  // It starts by sorting the words by.length().








































  // The ECMAScript 3 reserved word list.

  bool isReservedWord3(std::string arg) { return false; } 

  // ECMAScript 5 reserved words.

  bool isReservedWord5(std::string arg) { return false; } 

  // The additional reserved words in strict mode.

  bool isStrictReservedWord(std::string arg) { return false; } 

  // The forbidden variable names in strict mode.

  bool isStrictBadIdWord(std::string arg) { return false; } 

  // And the keywords.

  bool isKeyword(std::string arg) { return false; } 

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.

  auto nonASCIIwhitespace = RegExp("[object Object]"); 
  std::string nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc"; 
  std::string nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f"; 
  auto nonASCIIidentifierStart = RegExp(std::string("[") + nonASCIIidentifierStartChars + std::string("]")); 
  auto nonASCIIidentifier = RegExp(std::string("[") + nonASCIIidentifierStartChars + nonASCIIidentifierChars + std::string("]")); 

  // Whether a single character denotes a newline.

  auto newline = RegExp("[object Object]"); 

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  struct regexp_t lineBreak = RegExp("[object Object]"); 

  // Test whether a given character code starts an identifier.

  auto isIdentifierStart  (auto code) {
    if (code < 65) {
return code == 36;
}
    if (code < 91) {
return true;
}
    if (code < 97) {
return code == 95;
}
    if (code < 123) {
return true;
}
    return code >= 0xaa && test(nonASCIIidentifierStart, fromCharCode(code));
  }; 

  // Test whether a given character is part of an identifier.

  auto isIdentifierChar  (auto code) {
    if (code < 48) {
return code == 36;
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
return code == 95;
}
    if (code < 123) {
return true;
}
    return code >= 0xaa && test(nonASCIIidentifier, fromCharCode(code));
  }; 

  // ## Tokenizer

  // These are used when `options.locations` is on, for the
  // `tokStartLoc` and `tokEndLoc` properties.

  auto line_loc_t() {
    THIS.line = tokCurLine;
    THIS.column = tokPos - tokLineStart;
  }

  // Reset the token state. Used at the start of a parse.

  auto initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    skipSpace();
  }

  // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
  // `tokRegexpAllowed`, and skips the space after the token, so that
  // the next one's `tokStart` will point at the right position.

  void finishToken(keyword_t type, auto val) {
    tokEnd = tokPos;
    if (options.locations) {
tokEndLoc = line_loc_t;
}
    tokType = type;
    skipSpace();
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
  }

  auto skipBlockComment() {
    auto startLoc = options.onComment && options.locations && line_loc_t; 
    auto start = tokPos;  auto end = indexOf(input, "*/", tokPos += 2); 
    if (end == -1) {
raise(tokPos - 2, "Unterminated comment");
}
    tokPos = end + 2;
    if (options.locations) {
{
      lineBreak.lastIndex = start;
      RegExpVector match = RegExpVector(); 
      while ((match = exec(lineBreak, input)) && match.index < tokPos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length();
      }
    }
}
    if (options.onComment) {
onComment(options, true, slice(input, start + 2, end), start, tokPos,
                        startLoc, options.locations && line_loc_t);
}
  }

  auto skipLineComment() {
    auto start = tokPos; 
    auto startLoc = options.onComment && options.locations && line_loc_t; 
    auto ch = charCodeAt(input, tokPos+=2); 
    while (tokPos < inputLen && ch != 10 && ch != 13 && ch != 8232 && ch != 8233) {
      ++tokPos;
      ch = charCodeAt(input, tokPos);
    }
    if (options.onComment) {
onComment(options, false, slice(input, start + 2, tokPos), start, tokPos,
                        startLoc, options.locations && line_loc_t);
}
  }

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  void skipSpace() {
    while (tokPos < inputLen) {
      auto ch = charCodeAt(input, tokPos); 
      if (ch == 32) {
{ // ' '
        ++tokPos;
      }
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
readNumber(true);
}
    ++tokPos;
    finishToken(_dot);
  }

  void readToken_slash (...) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (tokRegexpAllowed) {
{++tokPos; readRegexp();}
}
    if (next == 61) {
finishOp(_assign, 2);
}
    finishOp(_slash, 1);
  }

  auto readToken_mult_modulo() { // '%*'
    auto next = charCodeAt(input, tokPos + 1); 
    if (next == 61) {
finishOp(_assign, 2);
}
    finishOp(_multiplyModulo, 1);
  }

  auto readToken_pipe_amp(auto code) { // '|&'
    auto next = charCodeAt(input, tokPos + 1); 
    if (next == code) {
finishOp(code == 124 ? _logicalOR : _logicalAND, 2);
}
    if (next == 61) {
finishOp(_assign, 2);
}
    finishOp(code == 124 ? _bitwiseOR : _bitwiseAND, 1);
  }

  auto readToken_caret() { // '^'
    auto next = charCodeAt(input, tokPos + 1); 
    if (next == 61) {
finishOp(_assign, 2);
}
    finishOp(_bitwiseXOR, 1);
  }

  auto readToken_plus_min(auto code) { // '+-'
    auto next = charCodeAt(input, tokPos + 1); 
    if (next == code) {
{
      if (next == 45 && charCodeAt(input, tokPos + 2) == 62 &&
          test(newline, slice(input, lastEnd, tokPos))) {
{
        // A `-->` line comment
        tokPos += 3;
        skipLineComment();
        skipSpace();
        return readToken();
      }
}
      finishOp(_incDec, 2);
    }
}
    if (next == 61) {
finishOp(_assign, 2);
}
    finishOp(_plusMin, 1);
  }

  auto readToken_lt_gt(auto code) { // '<>'
    auto next = charCodeAt(input, tokPos + 1); 
    int size = 1; 
    if (next == code) {
{
      size = code == 62 && charCodeAt(input, tokPos + 2) == 62 ? 3 : 2;
      if (charCodeAt(input, tokPos + size) == 61) {
finishOp(_assign, size + 1);
}
      finishOp(_bitShift, size);
    }
}
    if (next == 33 && code == 60 && charCodeAt(input, tokPos + 2) == 45 &&
        charCodeAt(input, tokPos + 3) == 45) {
{
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      tokPos += 4;
      skipLineComment();
      skipSpace();
      return readToken();
    }
}
    if (next == 61) {
size = charCodeAt(input, tokPos + 2) == 61 ? 3 : 2;
}
    finishOp(_relational, size);
  }

  auto readToken_eq_excl(auto code) { // '=!'
    auto next = charCodeAt(input, tokPos + 1); 
    if (next == 61) {
finishOp(_equality, charCodeAt(input, tokPos + 2) == 61 ? 3 : 2);
}
    finishOp(code == 61 ? _eq : _prefix, 1);
  }

  auto getTokenFromCode(auto code) {
    switch(code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit.
    case 46:{ // '.'
      readToken_dot();}

      // Punctuation tokens.
    case 40:{ ++tokPos; finishToken(_parenL);}
    case 41:{ ++tokPos; finishToken(_parenR);}
    case 59:{ ++tokPos; finishToken(_semi);}
    case 44:{ ++tokPos; finishToken(_comma);}
    case 91:{ ++tokPos; finishToken(_bracketL);}
    case 93:{ ++tokPos; finishToken(_bracketR);}
    case 123:{ ++tokPos; finishToken(_braceL);}
    case 125:{ ++tokPos; finishToken(_braceR);}
    case 58:{ ++tokPos; finishToken(_colon);}
    case 63:{ ++tokPos; finishToken(_question);}

      // '0x' is a hexadecimal number.
    case 48:{ // '0'
      auto next = charCodeAt(input, tokPos + 1); 
      if (next == 120 || next == 88) {
readHexNumber();
}}
      // Anything else beginning with a digit is an integer, octal
      // number, or float.
    case 49:{} case 50:{} case 51:{} case 52:{} case 53:{} case 54:{} case 55:{} case 56:{} case 57:{ // 1-9
      readNumber(false);}

      // Quotes produce strings.
    case 34:{} case 39:{ // '"', "'"
      return readString(code);}

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47:{ // '/'
      readToken_slash(code);}

    case 37:{} case 42:{ // '%*'
      readToken_mult_modulo();}

    case 124:{} case 38:{ // '|&'
      return readToken_pipe_amp(code);}

    case 94:{ // '^'
      readToken_caret();}

    case 43:{} case 45:{ // '+-'
      return readToken_plus_min(code);}

    case 60:{} case 62:{ // '<>'
      return readToken_lt_gt(code);}

    case 61:{} case 33:{ // '=!'
      return readToken_eq_excl(code);}

    case 126:{ // '~'
      finishOp(_prefix, 1);}
    }

    return false;
  }

  auto readToken(auto forceRegexp) {
    if (!forceRegexp) {
tokStart = tokPos;
}
    if (options.locations) {
tokStartLoc = line_loc_t;
}
    if (forceRegexp) {
readRegexp();
}
    if (tokPos >= inputLen) {
finishToken(_eof);
}

    auto code = charCodeAt(input, tokPos); 
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code == 92) {
readWord();
}

    auto tok = getTokenFromCode(code); 

    if (tok == false) {
{
      // If we are here, we either found a non-ASCII identifier
      // character, or something that's entirely disallowed.
      auto ch = fromCharCode(code); 
      if (ch == "\\" || test(nonASCIIidentifierStart, ch)) {
readWord();
}
      raise(tokPos, std::string("Unexpected character '") + ch + std::string("'"));
    }
}
    return tok;
  }

  void finishOp(keyword_t type, int size) {
    auto str = slice(input, tokPos, tokPos + size); 
    tokPos += size;
    finishToken(type, str);
  }

  // Parse a regular expression. Some context-awareness is necessary,
  // since a '/' inside a '[]' set does not end the expression.

  void readRegexp() {
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
        if (ch == "[") {
inClass = true;
}
        escaped = ch == "\\";
      }
}
      ++tokPos;
    }
    content = slice(input, start, tokPos); 
    ++tokPos;
    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    auto mods = readWord1(); 
    if (mods && !test(RegExp("[object Object]"), mods)) {
raise(start, "Invalid regexp flag");
}
    // try {
    //   var value = RegExp(content, mods);
    // } catch (e) {
    //   if (e instanceof SyntaxError) raise(start, e.message);
    //   raise(e);
    // }
    auto value = RegExp(content, mods); 
    if (ISNULL(value)) {
{
      raise(0, 'SyntaxError');
    }
}
    finishToken(_regexp, value);
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  int readInt(int radix, int len) {
    auto start = tokPos;  auto total = 0; 
    auto i = 0;  auto e = ISNULL(len) ? Infinity : len; ; for (; i < e;)
{
      auto code = charCodeAt(input, tokPos);  auto val = 0; 
      if (code >= 97) {
val = code - 97 + 10;
}
      if (val >= radix) {
break;
}
      ++tokPos;
      total = total * radix + val;
    }
    if (tokPos == start || ISNOTNULL(len) && tokPos - start != len) {
return DBL_NULL;
}

    return total;
  }

  auto readHexNumber() {
    tokPos += 2; // 0x
    auto val = readInt(16); 
    if (ISNULL(val)) {
raise(tokStart + 2, "Expected hexadecimal number");
}
    if (isIdentifierStart(charCodeAt(input, tokPos))) {
raise(tokPos, "Identifier directly after number");
}
    finishToken(_num, val);
  }

  // Read an integer, octal integer, or floating-point number.

  void readNumber(bool startsWithDot) {
    auto start = tokPos;  auto isFloat = false;  auto octal = charCodeAt(input, tokPos) == 48; 
    if (!startsWithDot && ISNULL(readInt(10))) {
raise(start, "Invalid number");
}
    if (charCodeAt(input, tokPos) == 46) {
{
      ++tokPos;
      readInt(10);
      isFloat = true;
    }
}
    auto next = charCodeAt(input, tokPos); 
    if (next == 69 || next == 101) {
{ // 'eE'
      next = charCodeAt(input, ++tokPos);
      if (next == 43 || next == 45) {
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

    auto str = slice(input, start, tokPos);  auto val = 0; 
    if (isFloat) {
val = parseFloat(str);
}
    finishToken(_num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  auto readString(auto quote) {
    tokPos++;
    std::string out
    ; for (; ;)
{
      if (tokPos >= inputLen) {
raise(tokStart, "Unterminated string constant");
}
      auto ch = charCodeAt(input, tokPos); 
      if (ch == quote) {
{
        ++tokPos;
        finishToken(_string, out);
      }
}
      if (ch == 92) {
{ // '\'
        ch = charCodeAt(input, ++tokPos);
        auto octal = exec(RegExp("[object Object]"), slice(input, tokPos, tokPos + 3))[0]; 
        while (octal && parseInt(octal, 8) > 255) octal = slice(octal, 0, -1);
        if (octal == "0") {
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
}
      }
}
    }
  }

  // Used to read character escape sequences ('\x', '\u', '\U').

  auto readHexChar(auto len) {
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
    std::string word = "";  auto first = true;  auto start = tokPos; 
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
}
      first = false;
    }
    return containsEsc ? word : slice(input, start, tokPos);
  }

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  auto readWord() {
    std::string word = readWord1(); 
    keyword_t type = _name; 
    if (!containsEsc && isKeyword(word)) {
type = keywordTypes(word);
}
    finishToken(type, word);
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
    if (options.locations) {
{
      while (tokPos < tokLineStart) {
        tokLineStart = lastIndexOf(input, "\n", tokLineStart - 2) + 1;
        --tokCurLine;
      }
    }
}
    skipSpace();
    readToken();
  }

  // Start an AST node, attaching a start offset.













  auto startNode() {
    auto node = new node_t(); 
    if (options.locations) {
node->loc = new node_loc_t();
}
    if (options.directSourceFile.length() > 0) {
node->sourceFile = options.directSourceFile;
}
    if (options.ranges) {
node->range = std::vector<int>(tokStart, 0);
}
    return node;
  }

  // Start a node whose start offset information should be based on
  // the start of another node. For example, a binary opr node is
  // only started after its left-hand side has already been parsed.

  auto startNodeFrom(auto other) {
    auto node = new node_t(); 
    node->start = other->start;
    if (options.locations) {
{
      node->loc = new node_loc_t();
      node->loc->start = other->loc->start;
    }
}
    if (options.ranges) {
node->range = std::vector<int>(other->range[0], 0);
}

    return node;
  }

  // Finish an AST node, adding `type` and `end` properties.

  node_t* finishNode(node_t* node, std::string type) {
    node->type = type;
    node->end = lastEnd;
    if (options.locations) {
node->loc->end = lastEndLoc;
}
    if (options.ranges) {
node->range[1] = lastEnd;
}
    return  node;
  }

  // Test whether a statement node is the string literal `"use strict"`.

  bool isUseStrict(node_t* stmt) {
    return options.ecmaVersion >= 5 && stmt->type == "ExpressionStatement" &&
      stmt->expression->type == "Literal" && stmt->expression->value == "use strict";
  }

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  auto eat(keyword_t type) {
    if (tokType == type) {
{
      next();
      return true;
    }
}
  }

  // Test whether a semicolon can be inserted at the current position.

  auto canInsertSemicolon() {
    return !options.strictSemicolons &&
      (tokType == _eof || tokType == _braceR || test(newline, slice(input, lastEnd, tokStart)));
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

  auto expect(keyword_t type) {
    if (tokType == type) {
next();
}
  }

  // Raise an unexpected token error.

  void unexpected() {
    raise(tokStart, "Unexpected token");
  }

  // Verify that a node is an lval — something that can be assigned
  // to.

  auto checkLVal(auto expr) {
    if (expr->type != "Identifier" && expr->type != "MemberExpression") {
raise(expr->start, "Assigning to rvalue");
}
    if (strict && expr->type == "Identifier" && isStrictBadIdWord(expr->name)) {
raise(expr->start, std::string("Assigning to ") + expr->name + std::string(" in strict mode"));
}
  }

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  auto parseTopLevel(auto program) {
    lastStart = lastEnd = tokPos;
    if (options.locations) {
lastEndLoc = line_loc_t;
}
    inFunction = strict = null;
    labels = std::vector<label_t>();
    readToken();

    auto node = program || startNode();  auto first = true; 
    if (!program) {
node->body = std::vector<int>();
}
    while (tokType != _eof) {
      auto stmt = parseStatement(); 
      push(node->body, stmt);
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

  auto parseStatement() {
    if (tokType == _slash || tokType == _assign && tokVal == "/=") {
readToken(true);
}

    auto starttype = tokType;  auto node = startNode(); 

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype._id) {
    case 6:{} case 9:{
      next();
      auto isBreak = starttype == _break; 
      if (eat(_semi) || canInsertSemicolon()) {
node->label = null;
}

      // Verify that there is an actual destination to break or
      // continue to.
      auto i = 0; ; for (; i < labels.size();)
{
        auto lab = labels[i]; 
        if (ISNULL(node->label) || lab.name == node->label->name) {
{
          if (ISNOTNULL(lab.kind) && (isBreak || lab.kind == "loop")) {
break;
}
          if (node->label && isBreak) {
break;
}
        }
}
      }
      if (i == labels.size()) {
raise(node->start, std::string("Unsyntactic ") + starttype.keyword);
}
      return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");}

    case 10:{
      next();
      semicolon();
      return finishNode(node, "DebuggerStatement");}

    case 12:{
      next();
      push(labels, loopLabel);
      node->body = parseStatement();
      pop(labels);
      expect(_while);
      node->test = parseParenExpression();
      semicolon();
      return finishNode(node, "DoWhileStatement");}

      // Disambiguating between a `for` and a `for`/`in` loop is
      // non-trivial. Basically, we have to parse the init `var`
      // statement or expression, disallowing the `in` opr (see
      // the second parameter to `parseExpression`), and then check
      // whether the next token is `in`. When there is no init part
      // (semicolon immediately after the opening parenthesis), it is
      // a regular `for` loop.

    case 15:{
      
      next();
      push(labels, loopLabel);
      expect(_parenL);
      if (tokType == _semi) {
return parseFor(node, null);
}
      if (tokType == _var) {
{
        auto init = startNode(); 
        next();
        parseVar(init, true);
        finishNode(init, "VariableDeclaration");
        if (init->declarations.size() == 1 && eat(_in)) {
return parseForIn(node, init);
}
        return parseFor(node, init);
      }
}
      auto init = parseExpression(false, true); 
      if (eat(_in)) {
{checkLVal(init); return parseForIn(node, init);}
}
      return parseFor(node, init);}

    case 16:{
      next();
      return parseFunction(node, true);}

    case 17:{
      next();
      node->test = parseParenExpression();
      node->consequent = parseStatement();
      node->alternate = eat(_else) ? parseStatement() : null;
      return finishNode(node, "IfStatement");}

    case 18:{
      if (!inFunction && !options.allowReturnOutsideFunction) {
raise(tokStart, "'return' outside of function");
}
      next();

      // In `return` (and `break`/`continue`), the keywords with
      // optional arguments, we eagerly look for a semicolon or the
      // possibility to insert one.

      if (eat(_semi) || canInsertSemicolon()) {
node->argument = null;
}
      return finishNode(node, "ReturnStatement");}

    case 19:{
      next();
      node->discriminant = parseParenExpression();
      node->cases = std::vector<node_t*>();
      expect(_braceL);
      push(labels, switchLabel);

      // Statements under must be grouped (by label) in SwitchCase
      // nodes. `cur` is used to keep the node that we are currently
      // adding statements to.

      node_t* cur = nullptr;  auto sawDefault = 0; ; for (; tokType != _braceR;)
{
        if (tokType == _case || tokType == _default) {
{
          auto isCase = tokType == _case; 
          if (cur) {
finishNode(cur, "SwitchCase");
}
          push(node->cases, cur = startNode());
          cur->consequents = std::vector<node_t*>();
          next();
          if (isCase) {
cur->test = parseExpression();
}
          expect(_colon);
        }
}
      }
      if (cur) {
finishNode(cur, "SwitchCase");
}
      next(); // Closing brace
      pop(labels);
      return finishNode(node, "SwitchStatement");}

    case 20:{
      next();
      if (test(newline, slice(input, lastEnd, tokStart))) {
raise(lastEnd, "Illegal newline after throw");
}
      node->argument = parseExpression();
      semicolon();
      return finishNode(node, "ThrowStatement");}

    case 21:{
      
      next();
      node->block = parseBlock();
      node->handler = null;
      if (tokType == _catch) {
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
      return finishNode(node, "TryStatement");}

    case 22:{
      next();
      parseVar(node);
      semicolon();
      return finishNode(node, "VariableDeclaration");}

    case 23:{
      
      next();
      node->test = parseParenExpression();
      push(labels, loopLabel);
      node->body = parseStatement();
      pop(labels);
      return finishNode(node, "WhileStatement");}

    case 24:{
      if (strict) {
raise(tokStart, "'with' in strict mode");
}
      next();
      node->object = parseParenExpression();
      node->body = parseStatement();
      return finishNode(node, "WithStatement");}

    case 33:{
      return parseBlock();}

    case 38:{
      next();
      return finishNode(node, "EmptyStatement");}

      // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.

    default:{
      auto maybeName = tokVal;  auto expr = parseExpression(); 
      if (starttype == _name && expr->type == "Identifier" && eat(_colon)) {
{
        auto i = 0; ; for (; i < labels.size();)
if (labels[i].name == maybeName) {
raise(expr->start, std::string("Label '") + maybeName + std::string("' is already declared"));
}
        std::string kind = tokType.isLoop ? "loop" : tokType == _switch ? "switch" : null; 
        push(labels, (label_t){kind: kind, name: maybeName});
        
        node->body = parseStatement();
        pop(labels);
        node->label = expr;
        return finishNode(node, "LabeledStatement");
      }
}}
    }
  }

  // Used for constructs like `switch` and `if` that insist on
  // parentheses around their expression.

  node_t* parseParenExpression() {
    expect(_parenL);
    auto val = parseExpression(); 
    expect(_parenR);
    return val;
  }

  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowStrict` is true (used for
  // function bodies).

  node_t* parseBlock(bool allowStrict) {
    auto node = startNode();  auto first = true;  auto strict = false;  auto oldStrict = 0; 
    node->bodyarr = std::vector<node_t*>();
    expect(_braceL);
    while (!eat(_braceR)) {
      auto stmt = parseStatement(); 
      push(node->bodyarr, stmt);
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

  node_t* parseFor(node_t* node, node_t* init) {
    node->init = init;
    expect(_semi);
    node->test = tokType == _semi ? null : parseExpression();
    expect(_semi);
    node->update = tokType == _parenR ? null : parseExpression();
    expect(_parenR);
    node->body = parseStatement();
    pop(labels);
    return finishNode(node, "ForStatement");
  }

  // Parse a `for`/`in` loop.

  node_t* parseForIn(node_t* node, node_t* init) {
    node->left = init;
    node->right = parseExpression();
    expect(_parenR);
    node->body = parseStatement();
    pop(labels);
    return finishNode(node, "ForInStatement");
  }

  // Parse a list of variable declarations.

  node_t* parseVar(node_t* node, bool noIn) {
    node->declarations = std::vector<node_t*>();
    node->kind = "var";
    ; for (; ;)
{
      auto decl = startNode(); 
      decl->id = parseIdent();
      if (strict && isStrictBadIdWord(decl->id->name)) {
raise(decl->id->start, std::string("Binding ") + decl->id->name + std::string(" in strict mode"));
}
      decl->init = eat(_eq) ? parseExpression(true, noIn) : null;
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

  node_t* parseExpression(bool noComma, bool noIn) {
    auto expr = parseMaybeAssign(noIn); 
    if (!noComma && tokType == _comma) {
{
      auto node = startNodeFrom(expr); 
      node->expressions = std::vector<node_t*>(expr);
      while (eat(_comma)) push(node->expressions, parseMaybeAssign(noIn));
      return finishNode(node, "SequenceExpression");
    }
}
    return expr;
  }

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.

  node_t* parseMaybeAssign(bool noIn) {
    auto left = parseMaybeConditional(noIn); 
    if (tokType.isAssign) {
{
      auto node = startNodeFrom(left); 
      node->opr = tokVal;
      node->left = left;
      next();
      node->right = parseMaybeAssign(noIn);
      checkLVal(left);
      return finishNode(node, "AssignmentExpression");
    }
}
    return left;
  }

  // Parse a ternary conditional (`?:`) opr.

  node_t* parseMaybeConditional(bool noIn) {
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

  node_t* parseExprOps(bool noIn) {
    return parseExprOp(parseMaybeUnary(), -1, noIn);
  }

  // Parse binary operators with the opr precedence parsing
  // algorithm. `left` is the left-hand side of the opr.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // opr that has a lower precedence than the set it is parsing.

  node_t* parseExprOp(node_t* left, double minPrec, bool noIn) {
    auto prec = tokType.binop; 
    if (ISNOTNULL(prec) && (!noIn || tokType != _in)) {
{
      if (prec > minPrec) {
{
        auto node = startNodeFrom(left); 
        node->left = left;
        node->opr = tokVal;
        auto op = tokType; 
        next();
        node->right = parseExprOp(parseMaybeUnary(), prec, noIn);
        auto exprNode = finishNode(node, (op == _logicalOR || op == _logicalAND) ? "LogicalExpression" : "BinaryExpression"); 
        return parseExprOp(exprNode, minPrec, noIn);
      }
}
    }
}
    return left;
  }

  // Parse unary operators, both prefix and postfix.

  node_t* parseMaybeUnary() {
    if (tokType.prefix) {
{
      auto node = startNode();  auto update = tokType.isUpdate; 
      node->opr = tokVal;
      node->prefix = true;
      tokRegexpAllowed = true;
      next();
      node->argument = parseMaybeUnary();
      if (update) {
checkLVal(node->argument);
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
      checkLVal(expr);
      next();
      expr = finishNode(node, "UpdateExpression");
    }
    return expr;
  }

  // Parse call, dot, and `[]`-subscript expressions.

  node_t* parseExprSubscripts() {
    return parseSubscripts(parseExprAtom());
  }

  node_t* parseSubscripts(node_t* base, bool noCalls) {
    if (eat(_dot)) {
{
      auto node = startNodeFrom(base); 
      node->object = base;
      node->property = parseIdent(true);
      node->computed = false;
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    }
}
  }

  // Parse an atomic expression — either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  node_t* parseExprAtom() {
    switch (tokType._id) {
    case 26:{
      auto node = startNode(); 
      next();
      return finishNode(node, "ThisExpression");}
    case 4:{
      return parseIdent();}
    case 1:{} case 3:{} case 2:{
      auto node = startNode(); 
      node->value = tokVal;
      node->raw = slice(input, tokStart, tokEnd);
      next();
      return finishNode(node, "Literal");}

    case 27:{} case 28:{} case 29:{
      auto node = startNode(); 
      node->value = tokType.atomValue;
      node->raw = tokType.keyword;
      next();
      return finishNode(node, "Literal");}

    case 35:{
      int tokStartLoc1 = tokStartLoc;  int tokStart1 = tokStart; 
      next();
      auto val = parseExpression(); 
      val->start = tokStart1;
      val->end = tokEnd;
      if (options.locations) {
{
        val->loc->start = tokStartLoc1;
        val->loc->end = tokEndLoc;
      }
}
      if (options.ranges) {
val->range = std::vector<int>(tokStart1, tokEnd);
}
      expect(_parenR);
      return val;}

    case 31:{
      auto node = startNode(); 
      next();
      node->elements = parseExprList(_bracketR, true, true);
      return finishNode(node, "ArrayExpression");}

    case 33:{
      return parseObj();}

    case 16:{
      auto node = startNode(); 
      next();
      return parseFunction(node, false);}

    case 25:{
      return parseNew();}

    default:{
      unexpected();}
    }
  }

  // New's precedence is slightly tricky. It must allow its argument
  // to be a `[]` or dot subscript expression, but not a call — at
  // least, not without wrapping it in parentheses. Thus, it uses the

  node_t* parseNew() {
    auto node = startNode(); 
    next();
    node->callee = parseSubscripts(parseExprAtom(), true);
    if (eat(_parenL)) {
node->arguments = parseExprList(_parenR, false);
}
    return finishNode(node, "NewExpression");
  }

  // Parse an object literal.

  node_t* parseObj() {
    auto node = startNode();  auto first = true;  auto sawGetSet = false; 
    node->properties = std::vector<node_t*>();
    next();
    while (!eat(_braceR)) {
      if (!first) {
{
        expect(_comma);
        if (options.allowTrailingCommas && eat(_braceR)) {
break;
}
      }
}

      node_t prop = {}; prop.key = parsePropertyName();  auto isGetSet = false;  std::string kind = ""; 
      if (eat(_colon)) {
{
        prop.value = parseExpression(true);
        kind = prop.kind = "init";
      }
}

      // getters and setters are not allowed to clash — either with
      // each other or with an init property — and in strict mode,
      // init properties are also not allowed to be repeated.

      if (prop.key->type == "Identifier" && (strict || sawGetSet)) {
{
        auto i = 0; ; for (; i < node->properties.size();)
{
          auto other = node->properties[i]; 
          if (other->key->name == prop.key->name) {
{
            auto conflict = kind == other->kind || isGetSet && other->kind == "init" ||
              kind == "init" && (other->kind == "get" || other->kind == "set"); 
            if (conflict && !strict && kind == "init" && other->kind == "init") {
conflict = false;
}
            if (conflict) {
raise(prop.key->start, "Redefinition of property");
}
          }
}
        }
      }
}
      push(node->properties, &prop);
    }
    return finishNode(node, "ObjectExpression");
  }

  node_t* parsePropertyName() {
    if (tokType == _num || tokType == _string) {
return parseExprAtom();
}
    return parseIdent(true);
  }

  // Parse a function declaration or literal (depending on the
  // `isStatement` parameter).

  node_t* parseFunction(node_t* node, bool isStatement) {
    if (tokType == _name) {
node->id = parseIdent();
}
    node->params = std::vector<node_t*>();
    auto first = true; 
    expect(_parenL);
    while (!eat(_parenR)) {
      if (!first) {
expect(_comma);
}
      push(node->params, parseIdent());
    }
    

    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    auto oldInFunc = inFunction;  auto oldLabels = labels; 
    inFunction = true; labels = std::vector<label_t>();
    node->body = parseBlock(true);
    inFunction = oldInFunc; labels = oldLabels;

    // If this is a strict mode function, verify that argument names
    // are not repeated, and it does not try to bind the words `eval`
    // or `arguments`.
    if (strict || node->body->bodyarr.size() && isUseStrict(node->body->bodyarr[0])) {
{
      auto i = node->id ? -1 : 0; ; for (; i < node->params.size();)
{
        auto id = i < 0 ? node->id : node->params[i]; 
        if (isStrictReservedWord(id->name) || isStrictBadIdWord(id->name)) {
raise(id->start, std::string("Defining '") + id->name + std::string("' in strict mode"));
}
        if (i >= 0) {
auto j = 0; ; for (; j < i;)
if (id->name == node->params[j]->name) {
raise(id->start, "Argument name clash in strict mode");
}
}
      }
    }
}

    return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
  }

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  std::vector<node_t*> parseExprList(keyword_t close, bool allowTrailingComma, bool allowEmpty) {
    auto elts = std::vector<node_t*>();  auto first = true; 
    while (!eat(close)) {
      if (!first) {
{
        expect(_comma);
        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) {
break;
}
      }
}

      if (allowEmpty && tokType == _comma) {
push(elts, null);
}
    }
    return elts;
  }

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  node_t* parseIdent(bool liberal) {
    auto node = startNode(); 
    if (liberal && options.forbidReserved == "everywhere") {
liberal = false;
}
    if (tokType == _name) {
{
      if (!liberal &&
          (options.forbidReserved &&
           (options.ecmaVersion == 3 ? isReservedWord3 : isReservedWord5)(tokVal) ||
           strict && isStrictReservedWord(tokVal)) &&
          indexOf(slice(input, tokStart, tokEnd), "\\") == -1) {
raise(tokStart, std::string("The keyword '") + tokVal + std::string("' is reserved"));
}
      node->name = tokVal;
    }
}
    tokRegexpAllowed = false;
    next();
    return finishNode(node, "Identifier");
  }


