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

"use strict";

export interface GetTokenFn {
  (forceRegexp?:boolean): any;
  jumpTo: any;
}

export interface Options {
  ecmaVersion?: number;
  strictSemicolons?: boolean;
  allowTrailingCommas?: boolean;
  forbidReserved?: string;
  allowReturnOutsideFunction?: boolean;
  locations?: boolean;
  onToken?: any;
  onComment?: any;
  ranges?: boolean;
  program?: any;
  sourceFile?: any;
  directSourceFile?: any;
};

export var version = "0.6.1";

// The main exported interface (under `self.acorn` when in the
// browser) is a `parse` function that takes a code string and
// returns an abstract syntax tree as specified by [Mozilla parser
// API][api], with the caveat that inline XML is not recognized.
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

var options:Options, input:string, inputLen:number, sourceFile:string;

export function parse (inpt:string, opts:any) {
  // jsparse_callback_open("parse");
  input = String(inpt); inputLen = input.length;
  setOptions(opts);
  initTokenState();
  return parseTopLevel(options.program);
};

// A second optional argument can be given to further configure
// the parser process. These options are recognized:

export var defaultOptions:Options = {
  // `ecmaVersion` indicates the ECMAScript version to parse. Must
  // be either 3, or 5, or 6. This influences support for strict
  // mode, the set of reserved words, support for getters and
  // setters and other features.
  ecmaVersion: 5,
  // Turn on `strictSemicolons` to prevent the parser from doing
  // automatic semicolon insertion.
  strictSemicolons: false,
  // When `allowTrailingCommas` is false, the parser will not allow
  // trailing commas in array and object literals.
  allowTrailingCommas: true,
  // By default, reserved words are not enforced. Enable
  // `forbidReserved` to enforce them. When this option has the
  // value "everywhere", reserved words and keywords can also not be
  // used as property names.
  forbidReserved: "",
  // When enabled, a return at the top level is not considered an
  // error.
  allowReturnOutsideFunction: false,
  // When `locations` is on, `loc` properties holding objects with
  // `start` and `end` properties in `{line, column}` form (with
  // line being 1-based and column 0-based) will be attached to the
  // nodes.
  locations: false,
  // A function can be passed as `onToken` option, which will
  // cause Acorn to call that function with object in the same
  // format as tokenize() returns. Note that you are not
  // allowed to call the parser from the callback—that will
  // corrupt its internal state.
  onToken: function () { },
  // A function can be passed as `onComment` option, which will
  // cause Acorn to call that function with `(block, text, start,
  // end)` parameters whenever a comment is skipped. `block` is a
  // boolean indicating whether this is a block (`/* */`) comment,
  // `text` is the content of the comment, and `start` and `end` are
  // character offsets that denote the start and end of the comment.
  // When the `locations` option is on, two more parameters are
  // passed, the full `{line, column}` locations of the start and
  // end of the comments. Note that you are not allowed to call the
  // parser from the callback—that will corrupt its internal state.
  onComment: function () { },
  // Nodes have their start and end characters offsets recorded in
  // `start` and `end` properties (directly on the node, rather than
  // the `loc` object, which holds line/column data. To also add a
  // [semi-standardized][range] `range` property holding a `[start,
  // end]` array with the same numbers, set the `ranges` option to
  // `true`.
  //
  // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
  ranges: true,
  // It is possible to parse multiple files into a single AST by
  // passing the tree produced by parsing the first file as
  // `program` option in subsequent parses. This will add the
  // toplevel forms of the parsed file to the `Program` (top) node
  // of an existing parse tree.
  program: <Node> null,
  // When `locations` is on, you can pass this to record the source
  // file in every node's `loc` object.
  sourceFile: <string> null,
  // This value, if given, is stored in every node, whether
  // `locations` is on or off.
  directSourceFile: <string> null
};

function setOptions(opts:Options) {
  options = opts || {};
  for (var opt in defaultOptions) if (!has(options, opt))
    (<{[index:string]:any}><any>options)[opt] = (<{[index:string]:any}><any>defaultOptions)[opt];
  sourceFile = options.sourceFile || null;

  isKeyword = options.ecmaVersion >= 6 ? isEcma6Keyword : isEcma5AndLessKeyword;
}

// The `getLineInfo` function is mostly useful when the
// `locations` option is off (for performance reasons) and you
// want to find the line/column position for a given character
// offset. `input` should be the code string that the offset refers
// into.

export function getLineInfo (input:string, offset:number) {
  for (var line = 1, cur = 0;;) {
    lineBreak.lastIndex = cur;
    var match = lineBreak.exec(input);
    if (match && match.index < offset) {
      ++line;
      cur = match.index + match[0].length;
    } else break;
  }
  return {line: line, column: offset - cur};
};

function getCurrentToken () {
  var token = {
    type: tokType,
    value: tokVal,
    start: tokStart,
    end: tokEnd,
    startLoc: <Position> null,
    endLoc: <Position> null
  };
  if (options.locations) {
    token.startLoc = tokStartLoc;
    token.endLoc = tokEndLoc;
  }
  return token;
};

// Acorn is organized as a tokenizer and a recursive-descent parser.
// The `tokenize` export provides an interface to the tokenizer.
// Because the tokenizer is optimized for being efficiently used by
// the Acorn parser itself, this interface is somewhat crude and not
// very modular. Performing another parse or call to `tokenize` will
// reset the internal state, and invalidate existing tokenizers.

export function tokenize (inpt:string, opts:any) {
  input = String(inpt); inputLen = input.length;
  setOptions(opts);
  initTokenState();

  var getToken = <GetTokenFn>function (forceRegexp?) {
    lastEnd = tokEnd;
    readToken(forceRegexp);
    return getCurrentToken();
  }
  getToken.jumpTo = function(pos:number, reAllowed:boolean) {
    tokPos = pos;
    if (options.locations) {
      tokCurLine = 1;
      tokLineStart = lineBreak.lastIndex = 0;
      var match:RegExpExecArray;
      while ((match = lineBreak.exec(input)) && match.index < pos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length;
      }
    }
    tokRegexpAllowed = reAllowed;
    skipSpace();
  };
  return getToken;
};

// State is kept in (closure-)global variables. We already saw the
// `options`, `input`, and `inputLen` variables above.

// The current position of the tokenizer in the input.

var tokPos:number;

// The start and end offsets of the current token.

var tokStart:number, tokEnd:number;

// When `options.locations` is true, these hold objects
// containing the tokens start and end line/column pairs.

var tokStartLoc:Position, tokEndLoc:Position;

// The type and value of the current token. Token types are objects,
// named by variables against which they can be compared, and
// holding properties that describe them (indicating, for example,
// the precedence of an infix operator, and the original name of a
// keyword token). The kind of value that's held in `tokVal` depends
// on the type of the token. For literals, it is the literal value,
// for operators, the operator name, and so on.

var tokType:Token, tokVal:any;

// Internal state for the tokenizer. To distinguish between division
// operators and regular expressions, it remembers whether the last
// token was one that is allowed to be followed by an expression.
// (If it is, a slash is probably a regexp, if it isn't it's a
// division operator. See the `parseStatement` function for a
// caveat.)

var tokRegexpAllowed:boolean;

// When `options.locations` is true, these are used to keep
// track of the current line, and know when a new line has been
// entered.

var tokCurLine:number, tokLineStart:number;

// These store the position of the previous token, which is useful
// when finishing a node and assigning its `end` position.

var lastStart:number, lastEnd:number, lastEndLoc:any;

// This is the parser's state. `inFunction` is used to reject
// `return` statements outside of functions, `inGenerator` to
// reject `yield`s outside of generators, `labels` to verify
// that `break` and `continue` have somewhere to jump to, and
// `strict` indicates whether strict mode is on.

interface Label {
  kind:string;
  name?:string;
}

var inFunction:boolean, inGenerator:boolean, labels:Label[], strict:boolean;

// This counter is used for checking that arrow expressions did
// not contain nested parentheses in argument list.

var metParenL:number;

// This is used by parser for detecting if it's inside ES6
// Template String. If it is, it should treat '$' as prefix before
// '{expression}' and everything else as string literals.

var inTemplate:boolean;

// This function is used to raise exceptions on parse errors. It
// takes an offset integer (into the current `input`) to indicate
// the location of the error, attaches the position to the end
// of the error message, and then raises a `SyntaxError` with that
// message.

function raise(pos:number, message?:string) {
  var loc = getLineInfo(input, pos);
  message += " (" + loc.line + ":" + loc.column + ")";
  var err = new SyntaxError(message);
  // TODO
  // err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
  throw err;
}

// Reused empty array added for node fields that are always empty.

var empty:Node[] = [];

// ## Token types

export interface Token {
  type?:string;
  keyword?:string;
  beforeExpr?:boolean;
  atomValue?:any;
  binop?:number;
  isUpdate?:boolean;
  isAssign?:boolean;
  isLoop?:boolean;
  prefix?:boolean;
  postfix?:boolean;
}

// The assignment of fine-grained, information-carrying type objects
// allows the tokenizer to store the information it has about a
// token in a way that is very cheap for the parser to look up.

// All token type variables start with an underscore, to make them
// easy to recognize.

// These are the general types. The `type` property is only used to
// make them recognizeable when debugging.

var _num:Token = {type: "num"}, _regexp:Token = {type: "regexp"}, _string:Token = {type: "string"};
var _name:Token = {type: "name"}, _eof:Token = {type: "eof"};

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

var _break:Token = {keyword: "break"}, _case:Token = {keyword: "case", beforeExpr: true}, _catch:Token = {keyword: "catch"};
var _continue:Token = {keyword: "continue"}, _debugger:Token = {keyword: "debugger"}, _default:Token = {keyword: "default"};
var _do:Token = {keyword: "do", isLoop: true}, _else:Token = {keyword: "else", beforeExpr: true};
var _finally:Token = {keyword: "finally"}, _for:Token = {keyword: "for", isLoop: true}, _function:Token = {keyword: "function"};
var _if:Token = {keyword: "if"}, _return:Token = {keyword: "return", beforeExpr: true}, _switch:Token = {keyword: "switch"};
var _throw:Token = {keyword: "throw", beforeExpr: true}, _try:Token = {keyword: "try"}, _var:Token = {keyword: "var"};
var _let:Token = {keyword: "let"}, _const:Token = {keyword: "const"};
var _while:Token = {keyword: "while", isLoop: true}, _with:Token = {keyword: "with"}, _new:Token = {keyword: "new", beforeExpr: true};
var _this:Token = {keyword: "this"};
var _class:Token = {keyword: "class"}, _extends:Token = {keyword: "extends", beforeExpr: true};
var _export:Token = {keyword: "export"}, _import:Token = {keyword: "import"};
var _yield:Token = {keyword: "yield", beforeExpr: true};

// The keywords that denote values.

var _null:Token = {keyword: "null", atomValue: null}, _true:Token = {keyword: "true", atomValue: true};
var _false:Token = {keyword: "false", atomValue: false};

// Some keywords are treated as regular operators. `in` sometimes
// (when parsing `for`) needs to be tested against specifically, so
// we assign a variable name to it for quick comparing.

var _in:Token = {keyword: "in", binop: 7, beforeExpr: true};

// Map keyword names to token types.

var _typeof:Token = {keyword: "typeof", prefix: true, beforeExpr: true}
var _instanceof:Token = {keyword: "instanceof", binop: 7, beforeExpr: true};
var _void:Token = {keyword: "void", prefix: true, beforeExpr: true};
var _delete:Token = {keyword: "delete", prefix: true, beforeExpr: true};

export var keywordTypes:{[index:string]: Token} = {"break": _break, "case": _case, "catch": _catch,
                    "continue": _continue, "debugger": _debugger, "default": _default,
                    "do": _do, "else": _else, "finally": _finally, "for": _for,
                    "function": _function, "if": _if, "return": _return, "switch": _switch,
                    "throw": _throw, "try": _try, "var": _var, "let": _let, "const": _const,
                    "while": _while, "with": _with,
                    "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                    "instanceof": _instanceof, "this": _this,
                    "typeof": _typeof,
                    "void": _void,
                    "delete": _delete,
                    "class": _class, "extends": _extends,
                    "export": _export, "import": _import, "yield": _yield};

// Punctuation token types. Again, the `type` property is purely for debugging.

var _bracketL:Token = {type: "[", beforeExpr: true}, _bracketR:Token = {type: "]"}, _braceL:Token = {type: "{", beforeExpr: true};
var _braceR:Token = {type: "}"}, _parenL:Token = {type: "(", beforeExpr: true}, _parenR:Token = {type: ")"};
var _comma:Token = {type: ",", beforeExpr: true}, _semi:Token = {type: ";", beforeExpr: true};
var _colon:Token = {type: ":", beforeExpr: true}, _dot:Token = {type: "."}, _ellipsis:Token = {type: "..."}, _question:Token = {type: "?", beforeExpr: true};
var _arrow:Token = {type: "=>", beforeExpr: true}, _bquote:Token = {type: "`"}, _dollarBraceL:Token = {type: "${", beforeExpr: true};

// Operators. These carry several kinds of properties to help the
// parser use them properly (the presence of these properties is
// what categorizes them as operators).
//
// `binop`, when present, specifies that this operator is a binary
// operator, and will refer to its precedence.
//
// `prefix` and `postfix` mark the operator as a prefix or postfix
// unary operator. `isUpdate` specifies that the node produced by
// the operator should be of type UpdateExpression rather than
// simply UnaryExpression (`++` and `--`).
//
// `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
// binary operators with a very low precedence, that should result
// in AssignmentExpression nodes.

var _slash:Token = {binop: 10, beforeExpr: true}, _eq:Token = {isAssign: true, beforeExpr: true};
var _assign:Token = {isAssign: true, beforeExpr: true};
var _incDec:Token = {postfix: true, prefix: true, isUpdate: true}, _prefix:Token = {prefix: true, beforeExpr: true};
var _logicalOR:Token = {binop: 1, beforeExpr: true};
var _logicalAND:Token = {binop: 2, beforeExpr: true};
var _bitwiseOR:Token = {binop: 3, beforeExpr: true};
var _bitwiseXOR:Token = {binop: 4, beforeExpr: true};
var _bitwiseAND:Token = {binop: 5, beforeExpr: true};
var _equality:Token = {binop: 6, beforeExpr: true};
var _relational:Token = {binop: 7, beforeExpr: true};
var _bitShift:Token = {binop: 8, beforeExpr: true};
var _plusMin:Token = {binop: 9, prefix: true, beforeExpr: true};
var _modulo:Token = {binop: 10, beforeExpr: true};

// '*' may be multiply or have special meaning in ES6
var _star:Token = {binop: 10, beforeExpr: true};

// Provide access to the token types for external users of the
// tokenizer.

export var tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                    parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                    dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq,
                    name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string,
                    arrow: _arrow, bquote: _bquote, dollarBraceL: _dollarBraceL};
for (var kw in keywordTypes) (<{[index:string]:any}><any>tokTypes)["_" + kw] = (<{[index:string]:any}><any>keywordTypes)[kw];

// This is a trick taken from Esprima. It turns out that, on
// non-Chrome browsers, to check whether a string is in a set, a
// predicate containing a big ugly `switch` statement is faster than
// a regular expression, and on Chrome the two are about on par.
// This function uses `eval` (non-lexical) to produce such a
// predicate from a space-separated string of words.
//
// It starts by sorting the words by length.

function makePredicate(wordsinput:string) {
  var words = wordsinput.split(" ");
  var f = "", cats:string[][] = [];
  out: for (var i = 0; i < words.length; ++i) {
    for (var j = 0; j < cats.length; ++j)
      if (cats[j][0].length == words[i].length) {
        cats[j].push(words[i]);
        continue out;
      }
    cats.push([words[i]]);
  }
  function compareTo(arr:string[]) {
    if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
    f += "switch(str){";
    for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
    f += "return true}return false;";
  }

  // When there are more than three length categories, an outer
  // switch first dispatches on the lengths, to save on comparisons.

  if (cats.length > 3) {
    cats.sort(function(a, b) {return b.length - a.length;});
    f += "switch(str.length){";
    for (var i = 0; i < cats.length; ++i) {
      var cat = cats[i];
      f += "case " + cat[0].length + ":";
      compareTo(cat);
    }
    f += "}";

  // Otherwise, simply generate a flat `switch` statement.

  } else {
    compareTo(words);
  }
  return new Function("str", f);
}

// The ECMAScript 3 reserved word list.

var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

// ECMAScript 5 reserved words.

var isReservedWord5 = makePredicate("class enum extends super const export import");

// The additional reserved words in strict mode.

var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

// The forbidden variable names in strict mode.

var isStrictBadIdWord = makePredicate("eval arguments");

// And the keywords.

// var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

var isEcma5AndLessKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");

var isEcma6Keyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this let const class extends export import yield");

var isKeyword = isEcma5AndLessKeyword;

// ## Character categories

// Big ugly regular expressions that match characters in the
// whitespace, identifier, and identifier-start categories. These
// are only applied when a character is found to actually have a
// code point above 128.
// Generated by `tools/generate-identifier-regex.js`.

var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
// var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
// var nonASCIIidentifierChars = "\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19B0-\u19C0\u19C8\u19C9\u19D0-\u19D9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF5\u1DFC-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA620-\uA629\uA66F\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F1\uA900-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F";
var nonASCIIidentifierStart = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/;
var nonASCIIidentifier = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0D01-\u0D03\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19B0-\u19C0\u19C8\u19C9\u19D0-\u19D9\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF8\u1CF9\u1DC0-\u1DF5\u1DFC-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA620-\uA629\uA66F\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F1\uA900-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F]/;

// Whether a single character denotes a newline.

var newline = /[\n\r\u2028\u2029]/;

// Matches a whole line break (where CRLF is considered a single
// line break). Used to count lines.

var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

// Test whether a given character code starts an identifier.

export function isIdentifierStart (code:number) {
  if (code < 65) return code === 36;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123)return true;
  return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
};

// Test whether a given character is part of an identifier.

export function isIdentifierChar (code:number) {
  if (code < 48) return code === 36;
  if (code < 58) return true;
  if (code < 65) return false;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123)return true;
  return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
};

// ## Tokenizer

// These are used when `options.locations` is on, for the
// `tokStartLoc` and `tokEndLoc` properties.

export class Position {
  constructor () {
    this.line = tokCurLine;
    this.column = tokPos - tokLineStart;
  }
  line:number;
  column:number;
}

// Reset the token state. Used at the start of a parse.

function initTokenState() {
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

function finishToken(type:Token, val?:any) {
  tokEnd = tokPos;
  if (options.locations) tokEndLoc = new Position;
  tokType = type;
  if (type !== _bquote || inTemplate) skipSpace();
  tokVal = val;
  tokRegexpAllowed = type.beforeExpr;
  if (options.onToken) {
    options.onToken(getCurrentToken());
  }
}

function skipBlockComment() {
  var startLoc = options.onComment && options.locations && new Position;
  var start = tokPos, end = input.indexOf("*/", tokPos += 2);
  if (end === -1) raise(tokPos - 2, "Unterminated comment");
  tokPos = end + 2;
  if (options.locations) {
    lineBreak.lastIndex = start;
    var match:RegExpExecArray;
    while ((match = lineBreak.exec(input)) && match.index < tokPos) {
      ++tokCurLine;
      tokLineStart = match.index + match[0].length;
    }
  }
  if (options.onComment)
    options.onComment(true, input.slice(start + 2, end), start, tokPos,
                      startLoc, options.locations && new Position);
}

function skipLineComment() {
  var start = tokPos;
  var startLoc = options.onComment && options.locations && new Position;
  var ch = input.charCodeAt(tokPos+=2);
  while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
    ++tokPos;
    ch = input.charCodeAt(tokPos);
  }
  if (options.onComment)
    options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                      startLoc, options.locations && new Position);
}

// Called at the start of the parse and after every token. Skips
// whitespace and comments, and.

function skipSpace() {
  while (tokPos < inputLen) {
    var ch = input.charCodeAt(tokPos);
    if (ch === 32) { // ' '
      ++tokPos;
    } else if (ch === 13) {
      ++tokPos;
      var next = input.charCodeAt(tokPos);
      if (next === 10) {
        ++tokPos;
      }
      if (options.locations) {
        ++tokCurLine;
        tokLineStart = tokPos;
      }
    } else if (ch === 10 || ch === 8232 || ch === 8233) {
      ++tokPos;
      if (options.locations) {
        ++tokCurLine;
        tokLineStart = tokPos;
      }
    } else if (ch > 8 && ch < 14) {
      ++tokPos;
    } else if (ch === 47) { // '/'
      var next = input.charCodeAt(tokPos + 1);
      if (next === 42) { // '*'
        skipBlockComment();
      } else if (next === 47) { // '/'
        skipLineComment();
      } else break;
    } else if (ch === 160) { // '\xa0'
      ++tokPos;
    } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
      ++tokPos;
    } else {
      break;
    }
  }
}

// ### Token reading

// This is the function that is called to fetch the next token. It
// is somewhat obscure, because it works in character codes rather
// than characters, and because operator parsing has been inlined
// into it.
//
// All in the name of speed.
//
// The `forceRegexp` parameter is used in the one case where the
// `tokRegexpAllowed` trick does not work. See `parseStatement`.

function readToken_dot() {
  var next = input.charCodeAt(tokPos + 1);
  if (next >= 48 && next <= 57) return readNumber(true);
  var next2 = input.charCodeAt(tokPos + 2);
  if (options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
    tokPos += 3;
    return finishToken(_ellipsis);
  } else {
    ++tokPos;
    return finishToken(_dot);
  }
}

function readToken_slash() { // '/'
  var next = input.charCodeAt(tokPos + 1);
  if (tokRegexpAllowed) {++tokPos; return readRegexp();}
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_slash, 1);
}

function readToken_mult_modulo(code:number) { // '%*'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(code === 42 ? _star : _modulo, 1);
}

function readToken_pipe_amp(code:number) { // '|&'
  var next = input.charCodeAt(tokPos + 1);
  if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
}

function readToken_caret() { // '^'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_bitwiseXOR, 1);
}

function readToken_plus_min(code:number) { // '+-'
  var next = input.charCodeAt(tokPos + 1);
  if (next === code) {
    if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
        newline.test(input.slice(lastEnd, tokPos))) {
      // A `-->` line comment
      tokPos += 3;
      skipLineComment();
      skipSpace();
      return readToken();
    }
    return finishOp(_incDec, 2);
  }
  if (next === 61) return finishOp(_assign, 2);
  return finishOp(_plusMin, 1);
}

function readToken_lt_gt(code:number) { // '<>'
  var next = input.charCodeAt(tokPos + 1);
  var size = 1;
  if (next === code) {
    size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
    if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
    return finishOp(_bitShift, size);
  }
  if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
      input.charCodeAt(tokPos + 3) == 45) {
    // `<!--`, an XML-style comment that should be interpreted as a line comment
    tokPos += 4;
    skipLineComment();
    skipSpace();
    return readToken();
  }
  if (next === 61)
    size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
  return finishOp(_relational, size);
}

function readToken_eq_excl(code:number) { // '=!', '=>'
  var next = input.charCodeAt(tokPos + 1);
  if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
  if (code === 61 && next === 62 && options.ecmaVersion >= 6) { // '=>'
    tokPos += 2;
    return finishToken(_arrow);
  }
  return finishOp(code === 61 ? _eq : _prefix, 1);
}

function getTokenFromCode(code:number):boolean {
  // Special rules work inside ES6 template strings.
  if (inTemplate) {
    // '`' and '${' have special meanings, but they should follow string (can be empty)
    if (tokType === _string) {
      if (code === 96) { // '`'
        ++tokPos;
        finishToken(_bquote); return true;
      }
      if (code === 36 && input.charCodeAt(tokPos + 1) === 123) { // '${'
        tokPos += 2;
        finishToken(_dollarBraceL); return true;
      }
    }
    // anything else is considered string literal
    readString(); return true;
  }

  switch (code) {
  // The interpretation of a dot depends on whether it is followed
  // by a digit or another two dots.
  case 46: // '.'
    readToken_dot(); return true;

  // Punctuation tokens.
  case 40: ++tokPos; finishToken(_parenL); return true;
  case 41: ++tokPos; finishToken(_parenR); return true;
  case 59: ++tokPos; finishToken(_semi); return true;
  case 44: ++tokPos; finishToken(_comma); return true;
  case 91: ++tokPos; finishToken(_bracketL); return true;
  case 93: ++tokPos; finishToken(_bracketR); return true;
  case 123: ++tokPos; finishToken(_braceL); return true;
  case 125: ++tokPos; finishToken(_braceR); return true;
  case 58: ++tokPos; finishToken(_colon); return true;
  case 63: ++tokPos; finishToken(_question); return true;
  
  case 96: // '`'
    if (options.ecmaVersion >= 6) {
      ++tokPos;
      finishToken(_bquote); return true;
    }

  case 48: // '0'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 120 || next === 88) { readRadixNumber(16); return true; } // '0x', '0X' - hex number
    if (options.ecmaVersion >= 6) {
      if (next === 111 || next === 79) { readRadixNumber(8); return true; } // '0o', '0O' - octal number
      if (next === 98 || next === 66) { readRadixNumber(2); return true; } // '0b', '0B' - binary number
    }
  // Anything else beginning with a digit is an integer, octal
  // number, or float.
  case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
    readNumber(false); return true;

  // Quotes produce strings.
  case 34: case 39: // '"', "'"
    readString(code); return true;

  // Operators are parsed inline in tiny state machines. '=' (61) is
  // often referred to. `finishOp` simply skips the amount of
  // characters it is given as second argument, and returns a token
  // of the type given by its first argument.

  case 47: // '/'
    readToken_slash(); return true;

  case 37: case 42: // '%*'
    readToken_mult_modulo(code); return true;

  case 124: case 38: // '|&'
    readToken_pipe_amp(code); return true;

  case 94: // '^'
    readToken_caret(); return true;

  case 43: case 45: // '+-'
    readToken_plus_min(code); return true;

  case 60: case 62: // '<>'
    readToken_lt_gt(code); return true;

  case 61: case 33: // '=!'
    readToken_eq_excl(code); return true;

  case 126: // '~'
    finishOp(_prefix, 1); return true;
  }

  return false;
}

function readToken(forceRegexp?:boolean) {
  if (!forceRegexp) tokStart = tokPos;
  else tokPos = tokStart + 1;
  if (options.locations) tokStartLoc = new Position;
  if (forceRegexp) return readRegexp();
  if (tokPos >= inputLen) return finishToken(_eof);

  var code = input.charCodeAt(tokPos);
  // Identifier or keyword. '\uXXXX' sequences are allowed in
  // identifiers, so '\' also dispatches to that.
  if (!inTemplate && (isIdentifierStart(code) || code === 92 /* '\' */)) return readWord();

  var tok = getTokenFromCode(code);

  if (tok === false) {
    // If we are here, we either found a non-ASCII identifier
    // character, or something that's entirely disallowed.
    var ch = String.fromCharCode(code);
    if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
    raise(tokPos, "Unexpected character '" + ch + "'");
  }
}

function finishOp(type:Token, size:number) {
  var str = input.slice(tokPos, tokPos + size);
  tokPos += size;
  finishToken(type, str);
}

// Parse a regular expression. Some context-awareness is necessary,
// since a '/' inside a '[]' set does not end the expression.

function readRegexp() {
  var content:string = "", escaped:boolean, inClass:boolean, start = tokPos;
  for (;;) {
    if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
    var ch = input.charAt(tokPos);
    if (newline.test(ch)) raise(start, "Unterminated regular expression");
    if (!escaped) {
      if (ch === "[") inClass = true;
      else if (ch === "]" && inClass) inClass = false;
      else if (ch === "/" && !inClass) break;
      escaped = ch === "\\";
    } else escaped = false;
    ++tokPos;
  }
  content = input.slice(start, tokPos);
  ++tokPos;
  // Need to use `readWord1` because '\uXXXX' sequences are allowed
  // here (don't ask).
  var mods = readWord1();
  if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regular expression flag");
  try { //JS
    var value = new RegExp(content, mods);
  } catch (e) { //JS
    if (e instanceof SyntaxError) raise(start, "Error parsing regular expression: " + e.message); //JS
    raise(e); //JS
    //C if (value.length() == 0) { raise(start, "Error parsing regular expression."); }
  } //JS
  return finishToken(_regexp, value);
}

// Read an integer in the given radix. Return null if zero digits
// were read, the integer value otherwise. When `len` is given, this
// will return `NaN` unless the integer has exactly `len` digits.

function readInt(radix:number, len?:number) {
  var start = tokPos, total = 0;
  for (var i = 0; !len || i < len; ++i) {
    var code = input.charCodeAt(tokPos), val:number;
    if (code >= 97) val = code - 97 + 10; // a
    else if (code >= 65) val = code - 65 + 10; // A
    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
    else val = Infinity;
    if (val >= radix) break;
    ++tokPos;
    total = total * radix + val;
  }
  if (tokPos === start || (len && tokPos - start !== len)) return NaN;

  return total;
}

function readRadixNumber(radix:number) {
  tokPos += 2; // 0x
  var val = readInt(radix);
  if (isNaN(val)) raise(tokStart + 2, "Expected number in radix " + radix);
  if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
  return finishToken(_num, val);
}

// Read an integer, octal integer, or floating-point number.

function readNumber(startsWithDot:boolean) {
  var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
  if (!startsWithDot && isNaN(readInt(10))) raise(start, "Invalid number");
  if (input.charCodeAt(tokPos) === 46) {
    ++tokPos;
    readInt(10);
    isFloat = true;
  }
  var next = input.charCodeAt(tokPos);
  if (next === 69 || next === 101) { // 'eE'
    next = input.charCodeAt(++tokPos);
    if (next === 43 || next === 45) ++tokPos; // '+-'
    if (isNaN(readInt(10))) raise(start, "Invalid number");
    isFloat = true;
  }
  if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

  var str = input.slice(start, tokPos), val:number;
  if (isFloat) val = parseFloat(str);
  else if (!octal || str.length === 1) val = parseInt(str, 10);
  else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
  else val = parseInt(str, 8);
  return finishToken(_num, val);
}

// Read a string value, interpreting backslash-escapes.

function readCodePoint() {
  var ch = input.charCodeAt(tokPos), code:number;
  
  if (ch === 123) {
    if (options.ecmaVersion < 6) unexpected();
    ++tokPos;
    code = readHexChar(input.indexOf('}', tokPos) - tokPos);
    ++tokPos;
    if (code > 0x10FFFF) unexpected();
  } else {
    code = readHexChar(4);
  }

  // UTF-16 Encoding
  if (code <= 0xFFFF) {
    return String.fromCharCode(code);
  }
  var cu1 = ((code - 0x10000) >> 10) + 0xD800;
  var cu2 = ((code - 0x10000) & 1023) + 0xDC00;
  return String.fromCharCode(cu1, cu2);
}

function readString(quote?:number) {
  if (!inTemplate) tokPos++;
  var out = "";
  for (;;) {
    if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
    var ch = input.charCodeAt(tokPos);
    if (inTemplate) {
      if (ch === 96 || ch === 36 && input.charCodeAt(tokPos + 1) === 123) // '`', '${'
        return finishToken(_string, out);
    } else if (ch === quote) {
      ++tokPos;
      return finishToken(_string, out);
    }
    if (ch === 92) { // '\'
      ch = input.charCodeAt(++tokPos);
      var octalmatch = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
      var octal = octalmatch ? octalmatch[0] : '0';
      while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
      if (octal === "0") octal = null;
      ++tokPos;
      if (octal) {
        if (strict) raise(tokPos - 2, "Octal literal in strict mode");
        out += String.fromCharCode(parseInt(octal, 8));
        tokPos += octal.length - 1;
      } else {
        switch (ch) {
        case 110: out += "\n"; break; // 'n' -> '\n'
        case 114: out += "\r"; break; // 'r' -> '\r'
        case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
        case 117: out += readCodePoint(); break; // 'u'
        case 85: out += String.fromCharCode(readHexChar(8)); break; // 'U'
        case 116: out += "\t"; break; // 't' -> '\t'
        case 98: out += "\b"; break; // 'b' -> '\b'
        case 118: out += "\u000b"; break; // 'v' -> '\u000b'
        case 102: out += "\f"; break; // 'f' -> '\f'
        case 48: out += "\0"; break; // 0 -> '\0'
        case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
        case 10: // ' \n'
          if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
          break;
        default: out += String.fromCharCode(ch); break;
        }
      }
    } else {
      ++tokPos;
      if (newline.test(String.fromCharCode(ch))) {
        if (inTemplate) {
          if (ch === 13 && input.charCodeAt(tokPos) === 10) {
            ++tokPos;
            ch = 10;
          }
          if (options.locations) {
            ++tokCurLine;
            tokLineStart = tokPos;
          }
        } else {
          raise(tokStart, "Unterminated string constant");
        }
      }
      out += String.fromCharCode(ch); // '\'
    }
  }
}

// Used to read character escape sequences ('\x', '\u', '\U').

function readHexChar(len:number) {
  var n = readInt(16, len);
  if (isNaN(n)) raise(tokStart, "Bad character escape sequence");
  return n;
}

// Used to signal to callers of `readWord1` whether the word
// contained any escape sequences. This is needed because words with
// escape sequences must not be interpreted as keywords.

var containsEsc:boolean;

// Read an identifier, and return it as a string. Sets `containsEsc`
// to whether the word contained a '\u' escape.
//
// Only builds up the word character-by-character when it actually
// containeds an escape, as a micro-optimization.

function readWord1() {
  containsEsc = false;
  var word:string, first = true, start = tokPos;
  for (;;) {
    var ch = input.charCodeAt(tokPos);
    if (isIdentifierChar(ch)) {
      if (containsEsc) word += input.charAt(tokPos);
      ++tokPos;
    } else if (ch === 92) { // "\"
      if (!containsEsc) word = input.slice(start, tokPos);
      containsEsc = true;
      if (input.charCodeAt(++tokPos) != 117) // "u"
        raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
      ++tokPos;
      var esc = readHexChar(4);
      var escStr = String.fromCharCode(esc);
      if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
      if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
        raise(tokPos - 4, "Invalid Unicode escape");
      word += escStr;
    } else {
      break;
    }
    first = false;
  }
  return containsEsc ? word : input.slice(start, tokPos);
}

// Read an identifier or keyword token. Will check for reserved
// words when necessary.

function readWord() {
  var word = readWord1();
  var type = _name;
  if (!containsEsc && isKeyword(word))
    type = (<{[index:string]:any}><any>keywordTypes)[word];
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
// *that* in the unary operator node.
//
// Acorn uses an [operator precedence parser][opp] to handle binary
// operator precedence, because it is much more compact than using
// the technique outlined above, which uses different, nesting
// functions to specify precedence, for all of the ten binary
// precedence levels that JavaScript defines.
//
// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

// ### Parser utilities

// Continue to the next token.

function next() {
  lastStart = tokStart;
  lastEnd = tokEnd;
  lastEndLoc = tokEndLoc;
  readToken();
}

// Enter strict mode. Re-reads the next token to please pedantic
// tests ("use strict"; 010; -- should fail).

function setStrict(strct:boolean) {
  strict = strct;
  tokPos = tokStart;
  if (options.locations) {
    while (tokPos < tokLineStart) {
      tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
      --tokCurLine;
    }
  }
  skipSpace();
  readToken();
}

// Start an AST node, attaching a start offset.

export class SourceLocation {
  constructor() {
    this.start = tokStartLoc;
    this.end = null;
    if (sourceFile !== null) this.source = sourceFile;
  }
  start:Position;
  end:Position;
  source:string;
};

export class Node {
  constructor() {
    this.type = null;
    this.start = tokStart;
    this.end = null;
  }
  type:Token;
  start:number;
  end:number;

  alternate:Node;
  argument:Node;
  arguments:Node[];
  blocks:Node[];
  body:Node;
  bodylist:Node[];
  block:Node;
  callee:Node;
  cases:Node[];
  computed:boolean;
  consequent:Node;
  consequents:Node[];
  declaration:Node;
  declarations:Node[];
  delegate:boolean;
  default:boolean;
  defaults:Node[];
  discriminant:Node;
  expression:any; // TODO no
  expressions:Node[];
  elements:Node[];
  filter:Node;
  finalizer:Node;
  generator:boolean;
  guard:Node;
  guardedHandlers:Node[];
  handler:Node;
  id:any;
  init:Node;
  key:Node;
  kind:string;
  label:Node;
  left:Node;
  loc:SourceLocation;
  method:boolean;
  name:any;
  object:Node;
  of:boolean;
  operator:string;
  param:Node;
  params:Node[];
  prefix:boolean;
  properties:Node[];
  property:Node;
  quasi:Node;
  quasis:Node[];
  range:number[];
  raw:string;
  rest:Node;
  right:Node;
  shorthand:boolean;
  static:boolean;
  specifiers:Node[];
  source:Node;
  sourceFile:string;
  superClass:Node;
  tag:Node;
  tail:boolean;
  test:Node;
  update:Node;
  value:any;
};

function startNode():Node {
  var node = new Node();
  if (options.locations)
    node.loc = new SourceLocation();
  if (options.directSourceFile)
    node.sourceFile = options.directSourceFile;
  if (options.ranges)
    node.range = [tokStart, 0];
  return node;
}

// Start a node whose start offset information should be based on
// the start of another node. For example, a binary operator node is
// only started after its left-hand side has already been parsed.

function startNodeFrom(other:Node) {
  var node = new Node();
  node.start = other.start;
  if (options.locations) {
    node.loc = new SourceLocation();
    node.loc.start = other.loc.start;
  }
  if (options.ranges)
    node.range = [other.range[0], 0];

  return node;
}

// Finish an AST node, adding `type` and `end` properties.

function enterNode(node:Node, type:string) {
  node.type = type;
  return node;
}

function finishNode(node:Node) {
  node.end = lastEnd;
  if (options.locations)
    node.loc.end = lastEndLoc;
  if (options.ranges)
    node.range[1] = lastEnd;
  //C jsparse_callback_close(convert_to_Node_C(node));
  return node;
}

// Test whether a statement node is the string literal `"use strict"`.

function isUseStrict(stmt:Node) {
  return options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" &&
    stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
}

// Predicate that tests whether the next token is of the given
// type, and if yes, consumes it as a side effect.

function eat(type:Token) {
  if (tokType === type) {
    next();
    return true;
  } else {
    return false;
  }
}

// Test whether a semicolon can be inserted at the current position.

function canInsertSemicolon() {
  return !options.strictSemicolons &&
    (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));
}

// Consume a semicolon, or, failing that, see if we are allowed to
// pretend that there is a semicolon at this position.

function semicolon() {
  if (!eat(_semi) && !canInsertSemicolon()) unexpected();
}

// Expect a token of a given type. If found, consume it, otherwise,
// raise an unexpected token error.

function expect(type:Token) {
  eat(type) || unexpected();
}

// Raise an unexpected token error.

function unexpected(pos?:number) {
  raise(pos != null ? pos : tokStart, "Unexpected token");
}

// Checks if hash object has a property.

function has(obj:any, propName:string) {
  return Object.prototype.hasOwnProperty.call(obj, propName);
}
// Convert existing expression atom to assignable pattern
// if possible.

function toAssignable(node:Node, allowSpread?:boolean, checkType?:boolean) {
  if (options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "Identifier":
      case "MemberExpression":
        break;          

      case "ObjectExpression":
        node.type = "ObjectPattern";
        for (var i = 0; i < node.properties.length; i++) {
          var prop = node.properties[i];
          if (prop.kind !== "init") unexpected(prop.key.start);
          toAssignable(prop.value, false, checkType);
        }
        break;

      case "ArrayExpression":
        node.type = "ArrayPattern";
        for (var i = 0, lastI = node.elements.length - 1; i <= lastI; i++) {
          toAssignable(node.elements[i], i === lastI, checkType);
        }
        break;

      case "SpreadElement":
        if (allowSpread) {
          toAssignable(node.argument, false, checkType);
          checkSpreadAssign(node.argument);
        } else {
          unexpected(node.start);
        }
        break;

      default:
        if (checkType) unexpected(node.start);
    }
  }
  return node;
}

// Checks if node can be assignable spread argument.

function checkSpreadAssign(node:Node) {
  if (node.type !== "Identifier" && node.type !== "ArrayPattern")
    unexpected(node.start);
}

// Verify that argument names are not repeated, and it does not
// try to bind the words `eval` or `arguments`.

function checkFunctionParam(param:Node, nameHash:any) {
  switch (param.type) {
    case "Identifier":
      if (isStrictReservedWord(param.name) || isStrictBadIdWord(param.name))
        raise(param.start, "Defining '" + param.name + "' in strict mode");
      if (has(nameHash, param.name))
        raise(param.start, "Argument name clash in strict mode");
      nameHash[param.name] = true;
      break;

    case "ObjectPattern":
      for (var i = 0; i < param.properties.length; i++)
        checkFunctionParam(param.properties[i].value, nameHash);
      break;

    case "ArrayPattern":
      for (var i = 0; i < param.elements.length; i++)
        checkFunctionParam(param.elements[i], nameHash);
      break;
  }
}

// Check if property name clashes with already added.
// Object/class getters and setters are not allowed to clash —
// either with each other or with an init property — and in
// strict mode, init properties are also not allowed to be repeated.

function checkPropClash(prop:Node, propHash:any) {
  if (prop.computed) return;
  var key = prop.key, name:string;
  switch (key.type) {
    case "Identifier": name = key.name; break;
    case "Literal": name = String(key.value); break;
    default: return;
  }
  var kind = prop.kind || "init", other:any;
  if (has(propHash, name)) {
    other = propHash[name];
    var isGetSet = Number(kind !== "init");
    if ((strict || isGetSet) && other[kind] || !(isGetSet ^ other.init))
      raise(key.start, "Redefinition of property");
  } else {
    other = propHash[name] = {
      init: false,
      get: false,
      set: false
    };
  }
  other[kind] = true;
}

// Verify that a node is an lval — something that can be assigned
// to.

function checkLVal(expr:Node, isBinding?:boolean) {
  switch (expr.type) {
    case "Identifier":
      if (strict && (isStrictBadIdWord(expr.name) || isStrictReservedWord(expr.name)))
        raise(expr.start, isBinding
          ? "Binding " + expr.name + " in strict mode"
          : "Assigning to " + expr.name + " in strict mode"
        );
      break;
    
    case "MemberExpression":
      if (!isBinding) break;

    case "ObjectPattern":
      for (var i = 0; i < expr.properties.length; i++)
        checkLVal(expr.properties[i].value, isBinding);
      break;

    case "ArrayPattern":
      for (var i = 0; i < expr.elements.length; i++) {
        var elem = expr.elements[i];
        if (elem) checkLVal(elem, isBinding);
      }
      break;

    case "SpreadElement":
      break;

    default:
      raise(expr.start, "Assigning to rvalue");
  }
}

// ### Statement parsing

// Parse a program. Initializes the parser, reads any number of
// statements, and wraps them in a Program node.  Optionally takes a
// `program` argument.  If present, the statements will be appended
// to its body instead of creating a new node.

function parseTopLevel(program:Node) {
  lastStart = lastEnd = tokPos;
  if (options.locations) lastEndLoc = new Position;
  inFunction = inGenerator = strict = false;
  labels = [];
  readToken();

  var node = program || startNode(), first = true;
  if (!program) node.bodylist = [];
  while (tokType !== _eof) {
    var stmt = parseStatement();
    node.bodylist.push(stmt);
    if (first && isUseStrict(stmt)) setStrict(true);
    first = false;
  }
  enterNode(node, "Program");
  return finishNode(node);
}

var loopLabel:Label = {kind: "loop"}, switchLabel:Label = {kind: "switch"};

// Parse a single statement.
//
// If expecting a statement and finding a slash operator, parse a
// regular expression literal. This is to handle cases like
// `if (foo) /blah/.exec(foo);`, where looking at the previous token
// does not help.

function parseStatement() {
  //C jsparse_callback_open("parseStatement");
  if (tokType === _slash || tokType === _assign && tokVal == "/=")
    readToken(true);

  var starttype = tokType, node = startNode();

  // Most types of statements are recognized by the keyword they
  // start with. Many are trivial to parse, some require a bit of
  // complexity.

  switch (starttype) {
  case _break: case _continue: return parseBreakContinueStatement(node, starttype.keyword);
  case _debugger: return parseDebuggerStatement(node);
  case _do: return parseDoStatement(node);
  case _for: return parseForStatement(node);
  case _function: return parseFunctionStatement(node);
  case _class: return parseClass(node, true);
  case _if: return parseIfStatement(node);
  case _return: return parseReturnStatement(node);
  case _switch: return parseSwitchStatement(node);
  case _throw: return parseThrowStatement(node);
  case _try: return parseTryStatement(node);
  case _var: case _let: case _const: return parseVarStatement(node, starttype.keyword);
  case _while: return parseWhileStatement(node);
  case _with: return parseWithStatement(node);
  case _braceL: return parseBlock(); // no point creating a function for this
  case _semi: return parseEmptyStatement(node);
  case _export: return parseExport(node);
  case _import: return parseImport(node);

    // If the statement does not start with a statement keyword or a
    // brace, it's an ExpressionStatement or LabeledStatement. We
    // simply start parsing an expression, and afterwards, if the
    // next token is a colon and the expression was a simple
    // Identifier node, we switch to interpreting it as a label.
  default:
    var maybeName = tokVal, expr = parseExpression();
    if (starttype === _name && expr.type === "Identifier" && eat(_colon))
      return parseLabeledStatement(node, maybeName, expr);
    else return parseExpressionStatement(node, expr);
  }
}

function parseBreakContinueStatement(node:Node, keyword:string) {
  // jsparse_callback_open("parseBreakContinueStatement");
  var isBreak = keyword == "break";
  next();
  if (eat(_semi) || canInsertSemicolon()) node.label = null;
  else if (tokType !== _name) unexpected();
  else {
    node.label = parseIdent();
    semicolon();
  }

  // Verify that there is an actual destination to break or
  // continue to.
  for (var i = 0; i < labels.length; ++i) {
    var lab = labels[i];
    if (node.label == null || lab.name === node.label.name) {
      if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
      if (node.label && isBreak) break;
    }
  }
  if (i === labels.length) raise(node.start, "Unsyntactic " + keyword);
  enterNode(node, isBreak ? "BreakStatement" : "ContinueStatement");
  return finishNode(node);
}

function parseDebuggerStatement(node:Node) {
  // jsparse_callback_open("parseDebuggerStatement");
  next();
  semicolon();
  enterNode(node, "DebuggerStatement");
  return finishNode(node);
}

function parseDoStatement(node:Node) {
  // jsparse_callback_open("parseDoStatement");
  next();
  labels.push(loopLabel);
  node.body = parseStatement();
  labels.pop();
  expect(_while);
  node.test = parseParenExpression();
  semicolon();
  enterNode(node, "DoWhileStatement");
  return finishNode(node);
}

// Disambiguating between a `for` and a `for`/`in` or `for`/`of`
// loop is non-trivial. Basically, we have to parse the init `var`
// statement or expression, disallowing the `in` operator (see
// the second parameter to `parseExpression`), and then check
// whether the next token is `in` or `of`. When there is no init
// part (semicolon immediately after the opening parenthesis), it
// is a regular `for` loop.

function parseForStatement(node:Node) {
  // jsparse_callback_open("parseForStatement");
  next();
  labels.push(loopLabel);
  expect(_parenL);
  if (tokType === _semi) return parseFor(node, null);
  if (tokType === _var || tokType === _let) {
    var init = startNode(), varKind = tokType.keyword, isLet = tokType === _let;
    next();
    parseVar(init, true, varKind);
    enterNode(init, "VariableDeclaration");
    finishNode(init);
    if ((tokType === _in || (tokType === _name && tokVal === "of")) && init.declarations.length === 1 &&
        !(isLet && init.declarations[0].init))
      return parseForIn(node, init);
    return parseFor(node, init);
  }
  var init:Node = parseExpression(false, true);
  if (tokType === _in || (tokType === _name && tokVal === "of")) {
    checkLVal(init);
    return parseForIn(node, init);
  }
  return parseFor(node, init);
}

function parseFunctionStatement(node:Node) {
  //C jsparse_callback_open("function-declaration");
  next();
  return parseFunction(node, true);
}

function parseIfStatement(node:Node) {
  //C jsparse_callback_open("if-start");
  enterNode(node, "IfStatement");
  next();
  //C jsparse_callback_open("if-test");
  node.test = parseParenExpression();
  //C jsparse_callback_open("if-consequent");
  node.consequent = parseStatement();
  if (eat(_else)) {
    //C jsparse_callback_open("if-alternate");
    node.alternate = parseStatement();
  } else {
    //C jsparse_callback_open("if-no-alternate");
    node.alternate = null;
  }
  //C jsparse_callback_open("if-end");
  return finishNode(node);
}

function parseReturnStatement(node:Node) {
  //C jsparse_callback_open("parseReturnStatement");
  if (!inFunction && !options.allowReturnOutsideFunction)
    raise(tokStart, "'return' outside of function");
  next();

  // In `return` (and `break`/`continue`), the keywords with
  // optional arguments, we eagerly look for a semicolon or the
  // possibility to insert one.

  if (eat(_semi) || canInsertSemicolon()) node.argument = null;
  else { node.argument = parseExpression(); semicolon(); }
  if (node.argument == null) {
    //C jsparse_callback_open("return-no-argument");
  } else {
    //C jsparse_callback_open("return-argument");
  }
  enterNode(node, "ReturnStatement");
  return finishNode(node);
}

function parseSwitchStatement(node:Node) {
  // jsparse_callback_open("parseSwitchStatement");
  next();
  node.discriminant = parseParenExpression();
  node.cases = [];
  expect(_braceL);
  labels.push(switchLabel);

  // Statements under must be grouped (by label) in SwitchCase
  // nodes. `cur` is used to keep the node that we are currently
  // adding statements to.

  for (var cur:Node, sawDefault:boolean; tokType != _braceR;) {
    if (tokType === _case || tokType === _default) {
      var isCase = tokType === _case;
      if (cur) { enterNode(cur, "SwitchCase"); finishNode(cur); }
      node.cases.push(cur = startNode());
      cur.consequents = [];
      next();
      if (isCase) cur.test = parseExpression();
      else {
        if (sawDefault) raise(lastStart, "Multiple default clauses"); sawDefault = true;
        cur.test = null;
      }
      expect(_colon);
    } else {
      if (!cur) unexpected();
      cur.consequents.push(parseStatement());
    }
  }
  if (cur) { enterNode(cur, "SwitchCase"); finishNode(cur); }
  next(); // Closing brace
  labels.pop();
  enterNode(node, "SwitchStatement");
  return finishNode(node);
}

function parseThrowStatement(node:Node) {
  // jsparse_callback_open("parseThrowStatement");
  next();
  if (newline.test(input.slice(lastEnd, tokStart)))
    raise(lastEnd, "Illegal newline after throw");
  node.argument = parseExpression();
  semicolon();
  enterNode(node, "ThrowStatement");
  return finishNode(node);
}

function parseTryStatement(node:Node) {
  // jsparse_callback_open("parseTryStatement");
  next();
  node.block = parseBlock();
  node.handler = null;
  if (tokType === _catch) {
    var clause = startNode();
    next();
    expect(_parenL);
    clause.param = parseIdent();
    if (strict && isStrictBadIdWord(clause.param.name))
      raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
    expect(_parenR);
    clause.guard = null;
    clause.body = parseBlock();
    enterNode(clause, "CatchClause");
    node.handler = finishNode(clause);
  }
  node.guardedHandlers = empty;
  node.finalizer = eat(_finally) ? parseBlock() : null;
  if (!node.handler && !node.finalizer)
    raise(node.start, "Missing catch or finally clause");
  enterNode(node, "TryStatement");
  return finishNode(node);
}

function parseVarStatement(node:Node, kind:string) {
  // jsparse_callback_open("parseVarStatement");
  next();
  parseVar(node, false, kind);
  semicolon();
  enterNode(node, "VariableDeclaration");
  return finishNode(node);
}

function parseWhileStatement(node:Node) {
  // jsparse_callback_open("parseWhileStatement");
  next();
  //C jsparse_callback_open("while-test");
  node.test = parseParenExpression();
  labels.push(loopLabel);
  //C jsparse_callback_open("while-body");
  node.body = parseStatement();
  labels.pop();
  enterNode(node, "WhileStatement");
  //C jsparse_callback_open("while-end");
  return finishNode(node);
}

function parseWithStatement(node:Node) {
  // jsparse_callback_open("parseWithStatement");
  if (strict) raise(tokStart, "'with' in strict mode");
  next();
  node.object = parseParenExpression();
  node.body = parseStatement();
  enterNode(node, "WithStatement");
  return finishNode(node);
}

function parseEmptyStatement(node:Node) {
  // jsparse_callback_open("parseEmptyStatement");
  next();
  enterNode(node, "EmptyStatement");
  return finishNode(node);
}

function parseLabeledStatement(node:Node, maybeName:string, expr:Node) {
  // jsparse_callback_open("parseLabeledStatement");
  for (var i = 0; i < labels.length; ++i)
    if (labels[i].name === maybeName) raise(expr.start, "Label '" + maybeName + "' is already declared");
  var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
  labels.push({name: maybeName, kind: kind});
  node.body = parseStatement();
  labels.pop();
  node.label = expr;
  enterNode(node, "LabeledStatement");
  return finishNode(node);
}

function parseExpressionStatement(node:Node, expr:Node) {
  // jsparse_callback_open("parseExpressionStatement");
  node.expression = expr;
  semicolon();
  enterNode(node, "ExpressionStatement");
  return finishNode(node);
}

// Used for constructs like `switch` and `if` that insist on
// parentheses around their expression.

function parseParenExpression() {
  // jsparse_callback_open("parseParenExpression");
  expect(_parenL);
  var val = parseExpression();
  expect(_parenR);
  return val;
}

// Parse a semicolon-enclosed block of statements, handling `"use
// strict"` declarations when `allowStrict` is true (used for
// function bodies).

function parseBlock(allowStrict?:boolean) {
  // jsparse_callback_open("parseBlock");
  var node = startNode(), first = true, strict = false, oldStrict:boolean;
  node.bodylist = [];
  expect(_braceL);
  while (!eat(_braceR)) {
    var stmt = parseStatement();
    node.bodylist.push(stmt);
    if (first && allowStrict && isUseStrict(stmt)) {
      oldStrict = strict;
      setStrict(strict = true);
    }
    first = false;
  }
  if (strict && !oldStrict) setStrict(false);
  enterNode(node, "BlockStatement");
  return finishNode(node);
}

// Parse a regular `for` loop. The disambiguation code in
// `parseStatement` will already have parsed the init statement or
// expression.

function parseFor(node:Node, init:Node) {
  // jsparse_callback_open("parseFor");
  node.init = init;
  expect(_semi);
  //C jsparse_callback_open("for-test");
  node.test = tokType === _semi ? null : parseExpression();
  expect(_semi);
  //C jsparse_callback_open("for-update");
  node.update = tokType === _parenR ? null : parseExpression();
  expect(_parenR);
  //C jsparse_callback_open("for-body");
  node.body = parseStatement();
  labels.pop();
  //C jsparse_callback_open("for-end");
  enterNode(node, "ForStatement");
  return finishNode(node);
}

// Parse a `for`/`in` and `for`/`of` loop, which are almost
// same from parser's perspective.

function parseForIn(node:Node, init:Node) {
  // jsparse_callback_open("parseForIn");
  var type = tokType === _in ? "ForInStatement" : "ForOfStatement";
  next();
  node.left = init;
  node.right = parseExpression();
  expect(_parenR);
  node.body = parseStatement();
  labels.pop();
  enterNode(node, type);
  return finishNode(node);
}

// Parse a list of variable declarations.

function parseVar(node:Node, noIn:boolean, kind:string) {
  // jsparse_callback_open("parseVar");
  node.declarations = [];
  node.kind = kind;
  for (;;) {
    //C jsparse_callback_open("var-declarator");
    var decl = startNode();
    decl.id = options.ecmaVersion >= 6 ? toAssignable(parseExprAtom()) : parseIdent();
    checkLVal(decl.id, true);
    if (eat(_eq)) {
      //C jsparse_callback_open("var-declarator-assign");
      decl.init = parseExpression(true, noIn);
    } else if (kind === _const.keyword) {
      unexpected();
    } else {
      //C jsparse_callback_open("var-declarator-no-assign");
      decl.init = null;
    }
    enterNode(decl, "VariableDeclarator");
    node.declarations.push(finishNode(decl));
    if (!eat(_comma)) break;
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
// or the `in` operator (in for loops initalization expressions).

function parseExpression(noComma?:boolean, noIn?:boolean) {
  //C jsparse_callback_open("parseExpression");
  var expr = parseMaybeAssign(noIn);
  if (!noComma && tokType === _comma) {
    var node = startNodeFrom(expr);
    node.expressions = [expr];
    while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
    enterNode(node, "SequenceExpression");
    return finishNode(node);
  }
  return expr;
}

// Parse an assignment expression. This includes applications of
// operators like `+=`.

function parseMaybeAssign(noIn:boolean) {
  // jsparse_callback_open("parseMaybeAssign");
  var left = parseMaybeConditional(noIn);
  if (tokType.isAssign) {
    //C jsparse_callback_open(tokVal.value_string.c_str());
    var node = startNodeFrom(left);
    node.operator = tokVal;
    node.left = tokType === _eq ? toAssignable(left) : left;
    checkLVal(left);
    next();
    node.right = parseMaybeAssign(noIn);
    enterNode(node, "AssignmentExpression");
    return finishNode(node);
  }
  return left;
}

// Parse a ternary conditional (`?:`) operator.

function parseMaybeConditional(noIn:boolean) {
  // jsparse_callback_open("parseMaybeConditional");
  var expr = parseExprOps(noIn);
  if (eat(_question)) {
    var node = startNodeFrom(expr);
    node.test = expr;
    //C jsparse_callback_open("ternary-consequent");
    node.consequent = parseExpression(true);
    expect(_colon);
    //C jsparse_callback_open("ternary-alternate");
    node.alternate = parseExpression(true, noIn);
    enterNode(node, "ConditionalExpression");
    return finishNode(node);
  }
  return expr;
}

// Start the precedence parser.

function parseExprOps(noIn:boolean) {
  // jsparse_callback_open("parseExprOps");
  return parseExprOp(parseMaybeUnary(), -1, noIn);
}

// Parse binary operators with the operator precedence parsing
// algorithm. `left` is the left-hand side of the operator.
// `minPrec` provides context that allows the function to stop and
// defer further parser to one of its callers when it encounters an
// operator that has a lower precedence than the set it is parsing.

function parseExprOp(left:Node, minPrec:number, noIn:boolean):Node {
  // jsparse_callback_open("parseExprOp");
  var prec = tokType.binop;
  if (prec != null && (!noIn || tokType !== _in)) {
    if (prec > minPrec) {
      var node = startNodeFrom(left);
      node.left = left;
      node.operator = tokVal;
      //C jsparse_callback_open(tokVal.value_string.c_str());
      var op = tokType;
      next();
      node.right = parseExprOp(parseMaybeUnary(), prec, noIn);
      enterNode(node, (op === _logicalOR || op === _logicalAND) ? "LogicalExpression" : "BinaryExpression");
      var exprNode = finishNode(node);
      return parseExprOp(exprNode, minPrec, noIn);
    }
  }
  return left;
}

// Parse unary operators, both prefix and postfix.

function parseMaybeUnary() {
  //C if (tokType.keyword == "function") jsparse_callback_open(tokVal.value_string.c_str());
  if (tokType.prefix) {
    //C jsparse_callback_open(("unary-" + tokVal.value_string).c_str());
    var node = startNode(), update = tokType.isUpdate;
    node.operator = tokVal;
    node.prefix = true;
    tokRegexpAllowed = true;
    next();
    enterNode(node, update ? "UpdateExpression" : "UnaryExpression");
    node.argument = parseMaybeUnary();
    if (update) checkLVal(node.argument);
    else if (strict && node.operator === "delete" &&
             node.argument.type === "Identifier")
      raise(node.start, "Deleting local variable in strict mode");
    return finishNode(node);
  }
  var expr = parseExprSubscripts();
  while (tokType.postfix && !canInsertSemicolon()) {
    //C jsparse_callback_open(tokVal.value_string.c_str());
    var node = startNodeFrom(expr);
    node.operator = tokVal;
    node.prefix = false;
    node.argument = expr;
    checkLVal(expr);
    next();
    enterNode(node, "UpdateExpression");
    expr = finishNode(node);
  }
  return expr;
}

// Parse call, dot, and `[]`-subscript expressions.

function parseExprSubscripts() {
  // jsparse_callback_open("parseExprSubscripts");
  return parseSubscripts(parseExprAtom());
}

function parseSubscripts(base:Node, noCalls?:boolean):Node {
  //C jsparse_callback_open("subscripts");
  if (eat(_dot)) {
    var node = startNodeFrom(base);
    enterNode(node, "MemberExpression");
    node.object = base;
    node.property = parseIdent(true);
    node.computed = false;
    return parseSubscripts(finishNode(node), noCalls);
  } else if (eat(_bracketL)) {
    //C jsparse_callback_open("member-var-open");
    var node = startNodeFrom(base);
    node.object = base;
    node.property = parseExpression();
    node.computed = true;
    expect(_bracketR);
    //C jsparse_callback_open("member-var-close");
    enterNode(node, "MemberExpression");
    return parseSubscripts(finishNode(node), noCalls);
  } else if (!noCalls && eat(_parenL)) {
    //C jsparse_callback_open("call-open");
    var node = startNodeFrom(base);
    enterNode(node, "CallExpression");
    node.callee = base;
    node.arguments = parseExprList(_parenR, false);
    return parseSubscripts(finishNode(node), noCalls);
  } else if (tokType === _bquote) {
    var node = startNodeFrom(base);
    node.tag = base;
    node.quasi = parseTemplate();
    enterNode(node, "TaggedTemplateExpression");
    return parseSubscripts(finishNode(node), noCalls);
  } return base;
}

// Parse an atomic expression — either a single token that is an
// expression, an expression started by a keyword like `function` or
// `new`, or an expression wrapped in punctuation like `()`, `[]`,
// or `{}`.

function parseExprAtom() {
  // jsparse_callback_open("parseExprAtom");
  switch (tokType) {
  case _this:
    var node = startNode();
    next();
    enterNode(node, "ThisExpression");
    return finishNode(node);
  
  case _yield:
    if (inGenerator) return parseYield();

  case _name:
    var id = parseIdent(tokType !== _name);
    if (eat(_arrow)) {
      return parseArrowExpression(startNodeFrom(id), [id]);
    }
    return id;
    
  case _num: case _string: case _regexp:
    var node = startNode();
    node.value = tokVal;
    node.raw = input.slice(tokStart, tokEnd);
    next();
    enterNode(node, "Literal");
    return finishNode(node);

  case _null: case _true: case _false:
    var node = startNode();
    node.value = tokType.atomValue;
    node.raw = tokType.keyword;
    next();
    enterNode(node, "Literal");
    return finishNode(node);

  case _parenL:
    var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart, val:Node, exprList:Node[];
    next();
    // check whether this is generator comprehension or regular expression
    if (options.ecmaVersion >= 6 && tokType === _for) {
      val = parseComprehension(startNode(), true);
    } else {
      var oldParenL = ++metParenL;
      if (tokType !== _parenR) {
        val = parseExpression();
        exprList = val.type === "SequenceExpression" ? val.expressions : [val];
      } else {
        exprList = [];
      }
      expect(_parenR);
      // if '=>' follows '(...)', convert contents to arguments
      if (metParenL === oldParenL && eat(_arrow)) {
        val = parseArrowExpression(startNode(), exprList);
      } else {
        // forbid '()' before everything but '=>'
        if (!val) unexpected(lastStart);
        // forbid '...' in sequence expressions
        if (options.ecmaVersion >= 6) {
          for (var i = 0; i < exprList.length; i++) {
            if (exprList[i].type === "SpreadElement") unexpected();
          }
        }
      }
    }
    val.start = tokStart1;
    val.end = lastEnd;
    if (options.locations) {
      val.loc.start = tokStartLoc1;
      val.loc.end = lastEndLoc;
    }
    if (options.ranges) {
      val.range = [tokStart1, lastEnd];
    }
    return val;

  case _bracketL:
    var node = startNode();
    next();
    //C jsparse_callback_open("array-literal-open");
    // check whether this is array comprehension or regular array
    if (options.ecmaVersion >= 6 && tokType === _for) {
      return parseComprehension(node, false);
    }
    node.elements = parseExprList(_bracketR, true, true);
    //C jsparse_callback_open("array-literal-close");
    enterNode(node, "ArrayExpression");
    return finishNode(node);

  case _braceL:
    return parseObj();

  case _function:
    var node = startNode();
    next();
    return parseFunction(node, false);

  case _class:
    return parseClass(startNode(), false);

  case _new:
    return parseNew();

  case _ellipsis:
    return parseSpread();

  case _bquote:
    return parseTemplate();

  default:
    unexpected();
  }
}

// New's precedence is slightly tricky. It must allow its argument
// to be a `[]` or dot subscript expression, but not a call — at
// least, not without wrapping it in parentheses. Thus, it uses the

function parseNew() {
  //C jsparse_callback_open("new-open");
  var node = startNode();
  next();
  node.callee = parseSubscripts(parseExprAtom(), true);
  //C jsparse_callback_open("new-args");
  if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
  else node.arguments = empty;
  //C jsparse_callback_open("new-close");
  enterNode(node, "NewExpression");
  return finishNode(node);
}

// Parse spread element '...expr'

function parseSpread() {
  // jsparse_callback_open("parseSpread");
  var node = startNode();
  next();
  node.argument = parseExpression(true);
  enterNode(node, "SpreadElement");
  return finishNode(node);
}

// Parse template expression.

function parseTemplate() {
  // jsparse_callback_open("parseTemplate");
  var node = startNode();
  node.expressions = [];
  node.quasis = [];
  inTemplate = true;
  next();
  for (;;) {
    var elem = startNode();
    elem.value = {cooked: tokVal, raw: input.slice(tokStart, tokEnd)};
    elem.tail = false;
    next();
    enterNode(elem, "TemplateElement");
    node.quasis.push(finishNode(elem));
    if (eat(_bquote)) { // '`', end of template
      elem.tail = true;
      break;
    }
    inTemplate = false;
    expect(_dollarBraceL);
    node.expressions.push(parseExpression());
    inTemplate = true;
    expect(_braceR);
  }
  inTemplate = false;
  enterNode(node, "TemplateLiteral");
  return finishNode(node);
}

// Parse an object literal.

function parseObj() {
  //C jsparse_callback_open("object-literal");
  var node = startNode(), first = true, propHash = {};
  node.properties = [];
  next();
  while (!eat(_braceR)) {
    if (!first) {
      expect(_comma);
      if (options.allowTrailingCommas && eat(_braceR)) break;
    } else first = false;

    var prop = startNode(), kind:string, isGenerator:boolean;
    if (options.ecmaVersion >= 6) {
      prop.method = false;
      prop.shorthand = false;
      isGenerator = eat(_star);
    }
    //C jsparse_callback_open("object-literal-key");
    parsePropertyName(prop);
    if (eat(_colon)) {
      //C jsparse_callback_open("object-literal-value");
      prop.value = parseExpression(true);
      kind = prop.kind = "init";
    } else if (options.ecmaVersion >= 6 && tokType === _parenL) {
      kind = prop.kind = "init";
      prop.method = true;
      prop.value = parseMethod(isGenerator);
    } else if (options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
               (prop.key.name === "get" || prop.key.name === "set")) {
      if (isGenerator) unexpected();
      kind = prop.kind = prop.key.name;
      parsePropertyName(prop);
      prop.value = parseMethod(false);
    } else if (options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
      kind = prop.kind = "init";
      prop.value = prop.key;
      prop.shorthand = true;
    } else unexpected();

    checkPropClash(prop, propHash);
    enterNode(prop, "Property");
    //C jsparse_callback_open("object-literal-push");
    node.properties.push(finishNode(prop));
  }
  enterNode(node, "ObjectExpression");
  return finishNode(node);
}

function parsePropertyName(prop:Node) {
  // jsparse_callback_open("parsePropertyName");
  if (options.ecmaVersion >= 6) {
    if (eat(_bracketL)) {
      prop.computed = true;
      prop.key = parseExpression();
      expect(_bracketR);
      return;
    } else {
      prop.computed = false;
    }
  }
  prop.key = (tokType === _num || tokType === _string) ? parseExprAtom() : parseIdent(true);
}

// Initialize empty function node.

function initFunction(node:Node) {
  node.id = null;
  node.params = [];
  if (options.ecmaVersion >= 6) {
    node.defaults = [];
    node.rest = null;
    node.generator = false;
  }
}

// Parse a function declaration or literal (depending on the
// `isStatement` parameter).

function parseFunction(node:Node, isStatement:boolean, allowExpressionBody?:boolean) {
  initFunction(node);
  if (options.ecmaVersion >= 6) {
    node.generator = eat(_star);
  }
  if (isStatement || tokType === _name) {
    node.id = parseIdent();
  }
  //C jsparse_callback_open("function-params");
  parseFunctionParams(node);
  //C jsparse_callback_open("function-body");
  parseFunctionBody(node, allowExpressionBody);
  enterNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
  return finishNode(node);
}

// Parse object or class method.

function parseMethod(isGenerator:boolean) {
  // jsparse_callback_open("parseMethod");
  var node = startNode();
  initFunction(node);
  parseFunctionParams(node);
  var allowExpressionBody:boolean;
  if (options.ecmaVersion >= 6) {
    node.generator = isGenerator;
    allowExpressionBody = true;
  } else {
    allowExpressionBody = false;
  }
  parseFunctionBody(node, allowExpressionBody);
  enterNode(node, "FunctionExpression");
  return finishNode(node);
}

// Parse arrow function expression with given parameters.

function parseArrowExpression(node:Node, params:Node[]) {
  // jsparse_callback_open("parseArrowExpression");
  initFunction(node);

  var defaults = node.defaults, hasDefaults = false;
  
  for (var i = 0, lastI = params.length - 1; i <= lastI; i++) {
    var param = params[i];

    if (param.type === "AssignmentExpression" && param.operator === "=") {
      hasDefaults = true;
      params[i] = param.left;
      defaults.push(param.right);
    } else {
      toAssignable(param, i === lastI, true);
      defaults.push(null);
      if (param.type === "SpreadElement") {
        params.pop();
        node.rest = param.argument;
        break;
      }
    }
  }

  node.params = params;
  if (!hasDefaults) node.defaults = [];

  parseFunctionBody(node, true);
  enterNode(node, "ArrowFunctionExpression");
  return finishNode(node);
}

// Parse function parameters.

function parseFunctionParams(node:Node) {
  // jsparse_callback_open("parseFunctionParams");
  var defaults:Node[] = [], hasDefaults = false;
  
  expect(_parenL);
  for (;;) {
    if (eat(_parenR)) {
      break;
    } else if (options.ecmaVersion >= 6 && eat(_ellipsis)) {
      node.rest = toAssignable(parseExprAtom(), false, true);
      checkSpreadAssign(node.rest);
      expect(_parenR);
      break;
    } else {
      //C jsparse_callback_open("function-param");
      node.params.push(options.ecmaVersion >= 6 ? toAssignable(parseExprAtom(), false, true) : parseIdent());
      if (options.ecmaVersion >= 6 && tokType === _eq) {
        next();
        hasDefaults = true;
        defaults.push(parseExpression(true));
      }
      if (!eat(_comma)) {
        expect(_parenR);
        break;
      }
    }
  }

  if (hasDefaults) node.defaults = defaults;
}

// Parse function body and check parameters.

function parseFunctionBody(node:Node, allowExpression:boolean) {
  // jsparse_callback_open("parseFunctionBody");
  var isExpression = allowExpression && tokType !== _braceL;
  
  if (isExpression) {
    node.body = parseExpression(true);
    node.expression = true;
  } else {
    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldInFunc = inFunction, oldInGen = inGenerator, oldLabels = labels;
    inFunction = true; inGenerator = node.generator; labels = [];
    node.body = parseBlock(true);
    node.expression = false;
    inFunction = oldInFunc; inGenerator = oldInGen; labels = oldLabels;
  }

  // If this is a strict mode function, verify that argument names
  // are not repeated, and it does not try to bind the words `eval`
  // or `arguments`.
  if (strict || !isExpression && node.body.bodylist.length && isUseStrict(node.body.bodylist[0])) {
    var nameHash = {};
    if (node.id)
      checkFunctionParam(node.id, nameHash);
    for (var i = 0; i < node.params.length; i++)
      checkFunctionParam(node.params[i], nameHash);
    if (node.rest)
      checkFunctionParam(node.rest, nameHash);
  }
}

// Parse a class declaration or literal (depending on the
// `isStatement` parameter).

function parseClass(node:Node, isStatement:boolean) {
  // jsparse_callback_open("parseClass");
  next();
  if (tokType === _name) {
    node.id = parseIdent();
  } else if (isStatement) {
    unexpected();
  } else {
    node.id = null;
  }
  node.superClass = eat(_extends) ? parseExpression() : null;
  var classBody = startNode(), methodHash = {}, staticMethodHash = {};
  classBody.bodylist = [];
  expect(_braceL);
  while (!eat(_braceR)) {
    var method = startNode();
    if (tokType === _name && tokVal === "static") {
      next();
      method.static = true;
    } else {
      method.static = false;
    }
    var isGenerator = eat(_star);
    parsePropertyName(method);
    if (tokType === _name && !method.computed && method.key.type === "Identifier" &&
        (method.key.name === "get" || method.key.name === "set")) {
      if (isGenerator) unexpected();
      method.kind = method.key.name;
      parsePropertyName(method);
    } else {
      method.kind = "";
    }
    method.value = parseMethod(isGenerator);
    checkPropClash(method, method.static ? staticMethodHash : methodHash);
    enterNode(method, "MethodDefinition");
    classBody.bodylist.push(finishNode(method));
    eat(_semi);
  }
  enterNode(classBody, "ClassBody");
  node.body = finishNode(classBody);
  enterNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
  return finishNode(node);
}

// Parses a comma-separated list of expressions, and returns them as
// an array. `close` is the token type that ends the list, and
// `allowEmpty` can be turned on to allow subsequent commas with
// nothing in between them to be parsed as `null` (which is needed
// for array literals).

function parseExprList(close:Token, allowTrailingComma?:boolean, allowEmpty?:boolean) {
  // jsparse_callback_open("parseExprList");
  var elts:Node[] = [], first = true;
  while (!eat(close)) {
    if (!first) {
      expect(_comma);
      //C jsparse_callback_open("parseExprList-next");
      if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
    } else first = false;

    if (allowEmpty && tokType === _comma) elts.push(null);
    else elts.push(parseExpression(true));
  }
  return elts;
}

// Parse the next token as an identifier. If `liberal` is true (used
// when parsing properties), it will also convert keywords into
// identifiers.

function parseIdent(liberal?:boolean) {
  // jsparse_callback_open("parseIdent");
  var node = startNode();
  if (liberal && options.forbidReserved == "everywhere") liberal = false;
  if (tokType === _name) {
    if (!liberal &&
        (options.forbidReserved &&
         (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(tokVal) ||
         strict && isStrictReservedWord(tokVal)) &&
        input.slice(tokStart, tokEnd).indexOf("\\") == -1)
      raise(tokStart, "The keyword '" + tokVal + "' is reserved");
    node.name = tokVal;
  } else if (liberal && tokType.keyword) {
    node.name = tokType.keyword;
  } else {
    unexpected();
  }
  tokRegexpAllowed = false;
  next();
  enterNode(node, "Identifier");
  return finishNode(node);
}

// Parses module export declaration.

function parseExport(node:Node) {
  // jsparse_callback_open("parseExport");
  next();
  // export var|const|let|function|class ...;
  if (tokType === _var || tokType === _const || tokType === _let || tokType === _function || tokType === _class) {
    node.declaration = parseStatement();
    node.default = false;
    node.specifiers = null;
    node.source = null;
  } else
  // export default ...;
  if (eat(_default)) {
    node.declaration = parseExpression(true);
    node.default = true;
    node.specifiers = null;
    node.source = null;
    semicolon();
  } else {
    // export * from '...'
    // export { x, y as z } [from '...']
    var isBatch = tokType === _star;
    node.declaration = null;
    node.default = false;
    node.specifiers = parseExportSpecifiers();
    if (tokType === _name && tokVal === "from") {
      next();
      if (tokType !== _string) {
        unexpected();
      }
      node.source = parseExprAtom();
    } else {
      if (isBatch) unexpected();
      node.source = null;
    }
  }
  enterNode(node, "ExportDeclaration");
  return finishNode(node);
}

// Parses a comma-separated list of module exports.

function parseExportSpecifiers() {
  // jsparse_callback_open("parseExportSpecifiers");
  var nodes:Node[] = [], first = true;
  if (tokType === _star) {
    // export * from '...'
    var node = startNode();
    next();
    enterNode(node, "ExportBatchSpecifier");
    nodes.push(finishNode(node));
  } else {
    // export { x, y as z } [from '...']
    expect(_braceL);
    while (!eat(_braceR)) {
      if (!first) {
        expect(_comma);
        if (options.allowTrailingCommas && eat(_braceR)) break;
      } else first = false;

      var node = startNode();
      node.id = parseIdent();
      if (tokType === _name && tokVal === "as") {
        next();
        node.name = parseIdent(true);
      } else {
        node.name = null;
      }
      enterNode(node, "ExportSpecifier");
      nodes.push(finishNode(node));
    }
  }
  return nodes;
}

// Parses import declaration.

function parseImport(node:Node) {
  // jsparse_callback_open("parseImport");
  next();
  // import '...';
  if (tokType === _string) {
    node.specifiers = [];
    node.source = parseExprAtom();
    node.kind = "";
  } else {
    node.specifiers = parseImportSpecifiers();
    if (tokType !== _name || tokVal !== "from") unexpected();
    next();
    if (tokType !== _string) {
      unexpected();
    }
    node.source = parseExprAtom();
    // only for backward compatibility with Esprima's AST
    // (it doesn't support mixed default + named yet)
    node.kind = node.specifiers[0].default ? "default" : "named";
  }
  enterNode(node, "ImportDeclaration");
  return finishNode(node);
}

// Parses a comma-separated list of module imports.

function parseImportSpecifiers() {
  // jsparse_callback_open("parseImportSpecifiers");
  var nodes:Node[] = [], first = true;
  if (tokType === _star) {
    var node = startNode();
    next();
    if (tokType !== _name || tokVal !== "as") unexpected();
    next();
    node.name = parseIdent();
    checkLVal(node.name, true);
    enterNode(node, "ImportBatchSpecifier");
    nodes.push(finishNode(node));
    return nodes;
  }
  if (tokType === _name) {
    // import defaultObj, { x, y as z } from '...'
    var node = startNode();
    node.id = parseIdent();
    checkLVal(node.id, true);
    node.name = null;
    node.default = true;
    enterNode(node, "ImportSpecifier");
    nodes.push(finishNode(node));
    if (!eat(_comma)) return nodes;
  }
  expect(_braceL);
  while (!eat(_braceR)) {
    if (!first) {
      expect(_comma);
      if (options.allowTrailingCommas && eat(_braceR)) break;
    } else first = false;

    var node = startNode();
    node.id = parseIdent(true);
    if (tokType === _name && tokVal === "as") {
      next();
      node.name = parseIdent();
    } else {
      node.name = null;
    }
    checkLVal(node.name || node.id, true);
    node.default = false;
    enterNode(node, "ImportSpecifier");
    nodes.push(finishNode(node));
  }
  return nodes;
}

// Parses yield expression inside generator.

function parseYield() {
  // jsparse_callback_open("parseYield");
  var node = startNode();
  next();
  if (eat(_semi) || canInsertSemicolon()) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = eat(_star);
    node.argument = parseExpression(true);
  }
  enterNode(node, "YieldExpression");
  return finishNode(node);
}

// Parses array and generator comprehensions.

function parseComprehension(node:Node, isGenerator:boolean) {
  // jsparse_callback_open("parseComprehension");
  node.blocks = [];
  while (tokType === _for) {
    var block = startNode();
    next();
    expect(_parenL);
    block.left = toAssignable(parseExprAtom());
    checkLVal(block.left, true);
    if (tokType !== _name || tokVal !== "of") unexpected();
    next();
    // `of` property is here for compatibility with Esprima's AST
    // which also supports deprecated [for (... in ...) expr]
    block.of = true;
    block.right = parseExpression();
    expect(_parenR);
    enterNode(block, "ComprehensionBlock");
    node.blocks.push(finishNode(block));
  }
  node.filter = eat(_if) ? parseParenExpression() : null;
  node.body = parseExpression();
  expect(isGenerator ? _parenR : _bracketR);
  node.generator = isGenerator;
  enterNode(node, "ComprehensionExpression");
  return finishNode(node);
}
