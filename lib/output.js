
;
auto version = "0.6.1"; 
options_t options = {ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, ranges: false, program: null, sourceFile: "", directSourceFile: ""};  auto input = std::string();  auto inputLen = 0;  std::string sourceFile = std::string(); 
auto parse(auto inpt, auto opts) {
    input = String(inpt);
    inputLen = input.length();
    setOptions(opts);
    initTokenState();
    return parseTopLevel(options.program);
}
;
options_t defaultOptions = {ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, ranges: true, program: null, sourceFile: "", directSourceFile: ""}; 


;

;

;
auto tokPos = 0; 
int tokStart = 0;  int tokEnd = 0; 
int tokStartLoc = 0;  int tokEndLoc = 0; 
keyword_t tokType = {};  std::string tokVal = std::string(); 
auto tokRegexpAllowed = 0; 
auto tokCurLine = 0;  auto tokLineStart = 0; 
auto lastStart = 0;  auto lastEnd = 0;  auto lastEndLoc = 0; 
auto inFunction = 0;  auto inGenerator = 0;  auto labels = std::vector<label_t>();  auto strict = 0; 
auto metParenL = 0; 
auto inTemplate = 0; 

auto empty = std::vector<Node*>({}); 
 struct keyword_t  _num = {_id: 2, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "num"}, _regexp = {_id: 3, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "regexp"}, _string = {_id: 4, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "string"};
 struct keyword_t  _name = {_id: 5, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "name"}, _eof = {_id: 6, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "eof"};
 struct keyword_t  _break = {_id: 7, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "break", postfix: false, prefix: false, type: ""}, _case = {_id: 8, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "case", postfix: false, prefix: false, type: ""}, _catch = {_id: 9, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "catch", postfix: false, prefix: false, type: ""};
 struct keyword_t  _continue = {_id: 10, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "continue", postfix: false, prefix: false, type: ""}, _debugger = {_id: 11, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "debugger", postfix: false, prefix: false, type: ""}, _default = {_id: 12, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "default", postfix: false, prefix: false, type: ""};
 struct keyword_t  _do = {_id: 13, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "do", postfix: false, prefix: false, type: ""}, _else = {_id: 14, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "else", postfix: false, prefix: false, type: ""};
 struct keyword_t  _finally = {_id: 15, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "finally", postfix: false, prefix: false, type: ""}, _for = {_id: 16, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "for", postfix: false, prefix: false, type: ""}, _function = {_id: 17, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "function", postfix: false, prefix: false, type: ""};
 struct keyword_t  _if = {_id: 18, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "if", postfix: false, prefix: false, type: ""}, _return = {_id: 19, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "return", postfix: false, prefix: false, type: ""}, _switch = {_id: 20, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "switch", postfix: false, prefix: false, type: ""};
 struct keyword_t  _throw = {_id: 21, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "throw", postfix: false, prefix: false, type: ""}, _try = {_id: 22, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "try", postfix: false, prefix: false, type: ""}, _var = {_id: 23, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "var", postfix: false, prefix: false, type: ""};
 struct keyword_t  _let = {_id: 24, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "let", postfix: false, prefix: false, type: ""}, _const = {_id: 25, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "const", postfix: false, prefix: false, type: ""};
 struct keyword_t  _while = {_id: 26, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: true, isUpdate: false, keyword: "while", postfix: false, prefix: false, type: ""}, _with = {_id: 27, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "with", postfix: false, prefix: false, type: ""}, _new = {_id: 28, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "new", postfix: false, prefix: false, type: ""};
 struct keyword_t  _this = {_id: 29, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "this", postfix: false, prefix: false, type: ""};
 struct keyword_t  _class = {_id: 30, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "class", postfix: false, prefix: false, type: ""}, _extends = {_id: 31, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "extends", postfix: false, prefix: false, type: ""};
 struct keyword_t  _export = {_id: 32, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "export", postfix: false, prefix: false, type: ""}, _import = {_id: 33, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "import", postfix: false, prefix: false, type: ""};
 struct keyword_t  _yield = {_id: 34, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "yield", postfix: false, prefix: false, type: ""};
 struct keyword_t  _null = {_id: 35, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "null", postfix: false, prefix: false, type: ""}, _true = {_id: 36, atomValue: ATOM_TRUE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "true", postfix: false, prefix: false, type: ""};
 struct keyword_t  _false = {_id: 37, atomValue: ATOM_FALSE, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "false", postfix: false, prefix: false, type: ""};
 struct keyword_t  _in = {_id: 38, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "in", postfix: false, prefix: false, type: ""};
auto __ignore = 0;  keyword_t keywordTypes(std::string arg) { if (arg == "break") { return _break; } if (arg == "case") { return _case; } if (arg == "catch") { return _catch; } if (arg == "continue") { return _continue; } if (arg == "debugger") { return _debugger; } if (arg == "default") { return _default; } if (arg == "do") { return _do; } if (arg == "else") { return _else; } if (arg == "finally") { return _finally; } if (arg == "for") { return _for; } if (arg == "function") { return _function; } if (arg == "if") { return _if; } if (arg == "return") { return _return; } if (arg == "switch") { return _switch; } if (arg == "throw") { return _throw; } if (arg == "try") { return _try; } if (arg == "var") { return _var; } if (arg == "let") { return _let; } if (arg == "const") { return _const; } if (arg == "while") { return _while; } if (arg == "with") { return _with; } if (arg == "null") { return _null; } if (arg == "true") { return _true; } if (arg == "false") { return _false; } if (arg == "new") { return _new; } if (arg == "in") { return _in; } if (arg == "this") { return _this; } if (arg == "class") { return _class; } if (arg == "extends") { return _extends; } if (arg == "export") { return _export; } if (arg == "import") { return _import; } if (arg == "yield") { return _yield; } return {}; } ;
 struct keyword_t  _bracketL = {_id: 39, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "["}, _bracketR = {_id: 40, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "]"}, _braceL = {_id: 41, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "{"};
 struct keyword_t  _braceR = {_id: 42, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "}"}, _parenL = {_id: 43, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "("}, _parenR = {_id: 44, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ")"};
 struct keyword_t  _comma = {_id: 45, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ","}, _semi = {_id: 46, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ";"};
 struct keyword_t  _colon = {_id: 47, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ":"}, _dot = {_id: 48, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "."}, _ellipsis = {_id: 49, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "..."}, _question = {_id: 50, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "?"};
 struct keyword_t  _arrow = {_id: 51, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "=>"}, _bquote = {_id: 52, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "`"}, _dollarBraceL = {_id: 53, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: "${"};
 struct keyword_t  _slash = {_id: 54, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""}, _eq = {_id: 55, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _assign = {_id: 56, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: true, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _incDec = {_id: 57, atomValue: ATOM_NULL, beforeExpr: false, binop: -1, isAssign: false, isLoop: false, isUpdate: true, keyword: "", postfix: true, prefix: true, type: ""}, _prefix = {_id: 58, atomValue: ATOM_NULL, beforeExpr: true, binop: -1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""};
 struct keyword_t  _logicalOR = {_id: 59, atomValue: ATOM_NULL, beforeExpr: true, binop: 1, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _logicalAND = {_id: 60, atomValue: ATOM_NULL, beforeExpr: true, binop: 2, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _bitwiseOR = {_id: 61, atomValue: ATOM_NULL, beforeExpr: true, binop: 3, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _bitwiseXOR = {_id: 62, atomValue: ATOM_NULL, beforeExpr: true, binop: 4, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _bitwiseAND = {_id: 63, atomValue: ATOM_NULL, beforeExpr: true, binop: 5, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _equality = {_id: 64, atomValue: ATOM_NULL, beforeExpr: true, binop: 6, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _relational = {_id: 65, atomValue: ATOM_NULL, beforeExpr: true, binop: 7, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _bitShift = {_id: 66, atomValue: ATOM_NULL, beforeExpr: true, binop: 8, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _plusMin = {_id: 67, atomValue: ATOM_NULL, beforeExpr: true, binop: 9, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: true, type: ""};
 struct keyword_t  _modulo = {_id: 68, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
 struct keyword_t  _star = {_id: 69, atomValue: ATOM_NULL, beforeExpr: true, binop: 10, isAssign: false, isLoop: false, isUpdate: false, keyword: "", postfix: false, prefix: false, type: ""};
auto tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR, parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon, dot: _dot, ellipsis: _ellipsis, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof, num: _num, regexp: _regexp, string: _string, arrow: _arrow, bquote: _bquote, dollarBraceL: _dollarBraceL}; 

auto isReservedWord3 = predicate_0; 
auto isReservedWord5 = predicate_1; 
auto isStrictReservedWord = predicate_2; 
auto isStrictBadIdWord = predicate_3; 
auto ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this"; 
auto isEcma5AndLessKeyword = predicate_4; 
auto isEcma6Keyword = predicate_5; 
auto isKeyword = isEcma5AndLessKeyword; 
auto nonASCIIwhitespace = regex_6; 
auto nonASCIIidentifierStart = regex_7; 
auto nonASCIIidentifier = regex_8; 
auto newline = regex_9; 
auto lineBreak = regex_10; 
bool isIdentifierStart(int code) {
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
bool isIdentifierChar(int code) {
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

    auto Position() {
        THIS.line = tokCurLine;
        THIS.column = tokPos - tokLineStart;
    }
    
int initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    metParenL = 0;
    inTemplate = false;
    skipSpace();
}
int finishToken(keyword_t type, std::string val) {
    tokEnd = tokPos;
    
    tokType = type;
    if (LOGICALOR(type!=_bquote,inTemplate)) {
skipSpace();
}
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
    
}
int skipBlockComment() {
    auto start = tokPos;  auto end = indexOf(input, "*/", tokPos += 2); 
    if (end==-1) {
raise(tokPos - 2, "Unterminated comment");
}
    tokPos = end + 2;
    
    
}
int skipLineComment() {
    auto start = tokPos; 
    auto ch = charCodeAt(input, tokPos += 2); 
    while (tokPos < inputLen && ch!=10 && ch!=13 && ch!=8232 && ch!=8233) {
        ++tokPos;
        ch = charCodeAt(input, tokPos);
    }
    
}
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
            
        }
} else if (LOGICALOR(LOGICALOR(ch==10,ch==8232),ch==8233)) {
{
            ++tokPos;
            
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
int readToken_dot() {
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
int readToken_mult_modulo(int code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(code==42 ? _star : _modulo, 1);
}
int readToken_pipe_amp(int code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==code) {
return finishOp(code==124 ? _logicalOR : _logicalAND, 2);
}
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(code==124 ? _bitwiseOR : _bitwiseAND, 1);
}
int readToken_caret() {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==61) {
return finishOp(_assign, 2);
}
    return finishOp(_bitwiseXOR, 1);
}
int readToken_plus_min(int code) {
    auto next = charCodeAt(input, tokPos + 1); 
    if (next==code) {
{
        if (next == 45 && charCodeAt(input, tokPos + 2) == 62 && test(newline, slice(input, lastEnd, tokPos))) {
{
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
int readToken_lt_gt(int code) {
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
int readToken_eq_excl(int code) {
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
    if (inTemplate) {
{
        if (tokType==_string) {
{
            if (code==96) {
{
                ++tokPos;
                finishToken(_bquote);
                return true;
            }
}
            if (code==36 && charCodeAt(input, tokPos + 1)==123) {
{
                tokPos += 2;
                finishToken(_dollarBraceL);
                return true;
            }
}
        }
}
        readString();
        return true;
    }
}
    switch (code) {
        case 46:{
            readToken_dot();
            return true;}
        case 40:{
            ++tokPos;
            finishToken(_parenL);
            return true;}
        case 41:{
            ++tokPos;
            finishToken(_parenR);
            return true;}
        case 59:{
            ++tokPos;
            finishToken(_semi);
            return true;}
        case 44:{
            ++tokPos;
            finishToken(_comma);
            return true;}
        case 91:{
            ++tokPos;
            finishToken(_bracketL);
            return true;}
        case 93:{
            ++tokPos;
            finishToken(_bracketR);
            return true;}
        case 123:{
            ++tokPos;
            finishToken(_braceL);
            return true;}
        case 125:{
            ++tokPos;
            finishToken(_braceR);
            return true;}
        case 58:{
            ++tokPos;
            finishToken(_colon);
            return true;}
        case 63:{
            ++tokPos;
            finishToken(_question);
            return true;}
        case 96:{
            if (options.ecmaVersion >= 6) {
{
                ++tokPos;
                finishToken(_bquote);
                return true;
            }
}}
        case 48:{
            auto next = charCodeAt(input, tokPos + 1); 
            if (LOGICALOR(next==120,next==88)) {
{
                readRadixNumber(16);
                return true;
            }
}
            if (options.ecmaVersion >= 6) {
{
                if (LOGICALOR(next==111,next==79)) {
{
                    readRadixNumber(8);
                    return true;
                }
}
                if (LOGICALOR(next==98,next==66)) {
{
                    readRadixNumber(2);
                    return true;
                }
}
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
            readNumber(false);
            return true;}
        case 34:{}
        case 39:{
            readString(code);
            return true;}
        case 47:{
            readToken_slash();
            return true;}
        case 37:{}
        case 42:{
            readToken_mult_modulo(code);
            return true;}
        case 124:{}
        case 38:{
            readToken_pipe_amp(code);
            return true;}
        case 94:{
            readToken_caret();
            return true;}
        case 43:{}
        case 45:{
            readToken_plus_min(code);
            return true;}
        case 60:{}
        case 62:{
            readToken_lt_gt(code);
            return true;}
        case 61:{}
        case 33:{
            readToken_eq_excl(code);
            return true;}
        case 126:{
            finishOp(_prefix, 1);
            return true;}
    }
    return false;
}
int readToken(bool forceRegexp) {
    if (!forceRegexp) {
tokStart = tokPos;
} else tokPos = tokStart + 1;
    
    if (forceRegexp) {
return readRegexp();
}
    if (tokPos >= inputLen) {
return finishToken(_eof);
}
    auto code = charCodeAt(input, tokPos); 
    if (!inTemplate && (LOGICALOR(isIdentifierStart(code),code==92))) {
return readWord();
}
    if (getTokenFromCode(code) == false) {
{
        auto ch = fromCharCode(code); 
        if (LOGICALOR(ch=="\\",test(nonASCIIidentifierStart, ch))) {
return readWord();
}
        raise(tokPos, std::string("Unexpected character '") + ch + std::string("'"));
    }
}
}
int finishOp(keyword_t type, int size) {
    auto str = slice(input, tokPos, tokPos + size); 
    tokPos += size;
    finishToken(type, str);
}
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
    auto mods = readWord1(); 
    if (mods && !test(([](std::string arg)->bool {  for (size_t i=0;i<arg.length();i++) { switch ((int) arg[i]) {  case 0x67: case 0x6d: case 0x73: case 0x69: case 0x79: break; default: return false;  } }  return true; }), mods)) {
raise(start, "Invalid regular expression flag");
}
    auto value = content;
    if (ISNULL(value)) {
{
        raise(start, "Error parsing regular expression.");
    }
}
    return finishToken(_regexp, value);
}
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
    tokPos += 2;
    auto intval = readInt(radix); 
    if (ISNULL(intval)) {
raise(tokStart + 2, std::string("Expected number in radix ") + radix);
}
    if (isIdentifierStart(charCodeAt(input, tokPos))) {
raise(tokPos, "Identifier directly after number");
}
    return finishToken(_num, intval);
}
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
}
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
std::string readCodePoint() {
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
}}
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
                    
                }
} else {
                    raise(tokStart, "Unterminated string constant");
                }
            }
}
            out += fromCharCode(ch);
        }
    }
}
int readHexChar(int len) {
    auto n = readInt(16, len); 
    if (ISNULL(n)) {
raise(tokStart, "Bad character escape sequence");
}
    return n;
}
auto containsEsc = 0; 
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
int readWord() {
    std::string word = readWord1(); 
    keyword_t type = _name; 
    if (!containsEsc && isKeyword(word)) {
type = keywordTypes(word);
}
    return finishToken(type, word);
}
int next() {
    lastStart = tokStart;
    lastEnd = tokEnd;
    lastEndLoc = tokEndLoc;
    readToken();
}
int setStrict(bool strct) {
    strict = strct;
    tokPos = tokStart;
    
    skipSpace();
    readToken();
}

    
    
;

    
    
;
Node* startNode() {
    auto node = new Node(); 
    
    if (options.directSourceFile.length() > 0) {
node->sourceFile = options.directSourceFile;
}
    if (options.ranges) {
node->range = std::vector<int>({tokStart, 0});
}
    return node;
}
Node* startNodeFrom(Node* other) {
    auto node = new Node(); 
    node->start = other->start;
    
    if (options.ranges) {
node->range = std::vector<int>({other->range[0], 0});
}
    return node;
}
Node* finishNode(Node* node, std::string type) {
    node->type = type;
    node->end = lastEnd;
    
    if (options.ranges) {
node->range[1] = lastEnd;
}
     jsparse_callback(type.c_str()); ;
    return node;
}

bool eat(keyword_t type) {
    if (tokType==type) {
{
        next();
        return true;
    }
} else {
        return false;
    }
}
bool canInsertSemicolon() {
    return !options.strictSemicolons && (LOGICALOR(LOGICALOR(tokType==_eof,tokType==_braceR),test(newline, slice(input, lastEnd, tokStart))));
}
int semicolon() {
    if (!eat(_semi) && !canInsertSemicolon()) {
unexpected();
}
}
int expect(keyword_t type) {
    LOGICALOR(eat(type),unexpected());
}
int unexpected(int pos) {
    raise(ISNOTNULL(pos) ? pos : tokStart, "Unexpected token");
}


int checkSpreadAssign(Node* node) {
    if (node->type!="Identifier" && node->type!="ArrayPattern") {
unexpected(node->start);
}
}

auto checkPropClash(auto prop, auto propHash) {
    if (prop->computed) {
return 0;
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
            return 0;}
    }
    std::string kind = LOGICALOR(prop->kind,"init");  auto other = 0; 
    if (has(propHash, name)) {
{
    }
} else {
    }
}

Node* parseTopLevel(Node* program) {
    lastStart = lastEnd = tokPos;
    
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
        return parseFor(node, init);
    }
}
    auto init = parseExpression(false, true); 
    if (LOGICALOR(tokType==_in,tokType==_name && tokVal=="of")) {
{
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
    next();
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
Node* parseParenExpression() {
    expect(_parenL);
    Node* val = parseExpression(); 
    expect(_parenR);
    return val;
}
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
Node* parseVar(Node* node, bool noIn, std::string kind) {
    node->declarations = std::vector<Node*>({});
    node->kind = kind;
    ; for (; ;)
{
        auto decl = startNode(); 
        decl->id = options.ecmaVersion >= 6 ? toAssignable(parseExprAtom()) : parseIdent();
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
Node* parseMaybeAssign(bool noIn) {
    auto left = parseMaybeConditional(noIn); 
    if (tokType.isAssign) {
{
        auto node = startNodeFrom(left); 
        node->_operator = tokVal;
        node->left = tokType==_eq ? toAssignable(left) : left;
        next();
        node->right = parseMaybeAssign(noIn);
        return finishNode(node, "AssignmentExpression");
    }
}
    return left;
}
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
Node* parseExprOps(bool noIn) {
    return parseExprOp(parseMaybeUnary(), -1, noIn);
}
Node* parseExprOp(Node* left, int minPrec, bool noIn) {
    auto prec = tokType.binop; 
    if (ISNOTNULL(prec) && (LOGICALOR(!noIn,tokType!=_in))) {
{
        if (prec > minPrec) {
{
            auto node = startNodeFrom(left); 
            node->left = left;
            node->_operator = tokVal;
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
Node* parseMaybeUnary() {
    if (tokType.prefix) {
{
        auto node = startNode();  auto update = tokType.isUpdate; 
        node->_operator = tokVal;
        node->prefix = true;
        tokRegexpAllowed = true;
        next();
        node->argument = parseMaybeUnary();
        if (strict && node->_operator=="delete" && node->argument->type=="Identifier") {
raise(node->start, "Deleting local variable in strict mode");
}
        return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
    }
}
    auto expr = parseExprSubscripts(); 
    while (tokType.postfix && !canInsertSemicolon()) {
        auto node = startNodeFrom(expr); 
        node->_operator = tokVal;
        node->prefix = false;
        node->argument = expr;
        next();
        expr = finishNode(node, "UpdateExpression");
    }
    return expr;
}
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
            node->raw = tokType.keyword;
            next();
            return finishNode(node, "Literal");}
        case 43:{
            int tokStartLoc1 = tokStartLoc;  auto tokStart1 = tokStart;  Node* val = 0;  std::vector<Node*> exprList = std::vector<Node*>(); 
            next();
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
                if (metParenL==oldParenL && eat(_arrow)) {
{
                    val = parseArrowExpression(startNode(), exprList);
                }
} else {
                    if (!val) {
unexpected(lastStart);
}
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
            
            if (options.ranges) {
{
                val->range = std::vector<int>({tokStart1, lastEnd});
            }
}
            return val;}
        case 39:{
            auto node = startNode(); 
            next();
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
Node* parseNew() {
    auto node = startNode(); 
    next();
    node->callee = parseSubscripts(parseExprAtom(), true);
    if (eat(_parenL)) {
node->arguments = parseExprList(_parenR, false);
} else node->arguments = empty;
    return finishNode(node, "NewExpression");
}
Node* parseSpread() {
    auto node = startNode(); 
    next();
    node->argument = parseExpression(true);
    return finishNode(node, "SpreadElement");
}
Node* parseTemplate() {
    auto node = startNode(); 
    return finishNode(node, "TemplateLiteral");
}
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
        push(node->properties, finishNode(prop, "Property"));
    }
    return finishNode(node, "ObjectExpression");
}
int parsePropertyName(Node* prop) {
    if (options.ecmaVersion >= 6) {
{
        if (eat(_bracketL)) {
{
            prop->computed = true;
            prop->key = parseExpression();
            expect(_bracketR);
            return 0;
        }
} else {
            prop->computed = false;
        }
    }
}
    prop->key = (LOGICALOR(tokType==_num,tokType==_string)) ? parseExprAtom() : parseIdent(true);
}
int initFunction(Node* node) {
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
Node* parseArrowExpression(Node* node, std::vector<Node*> params) {
    initFunction(node);
    auto defaults = node->defaults;  auto hasDefaults = false; 
    auto i = 0;  auto lastI = params.size() - 1; ; for (; i <= lastI;)
{
        auto param = params[i]; 
        if (param->type=="AssignmentExpression" && param->_operator=="=") {
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
int parseFunctionParams(Node* node) {
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
int parseFunctionBody(Node* node, bool allowExpression) {
    auto isExpression = allowExpression && tokType!=_braceL; 
    if (isExpression) {
{
        node->body = parseExpression(true);
    }
} else {
        auto oldInFunc = inFunction;  auto oldInGen = inGenerator;  auto oldLabels = labels; 
        inFunction = true;
        inGenerator = node->generator;
        labels = std::vector<label_t>({});
        node->body = parseBlock(true);
        inFunction = oldInFunc;
        inGenerator = oldInGen;
        labels = oldLabels;
    }
    if (LOGICALOR(strict,!isExpression && node->body->bodylist.size() && isUseStrict(node->body->bodylist[0]))) {
{
    }
}
}
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
        push(classBody->bodylist, finishNode(method, "MethodDefinition"));
        eat(_semi);
    }
    node->body = finishNode(classBody, "ClassBody");
    return finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
}
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
Node* parseExport(Node* node) {
    next();
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
std::vector<Node*> parseExportSpecifiers() {
    auto nodes = std::vector<Node*>({});  auto first = true; 
    if (tokType==_star) {
{
        auto node = startNode(); 
        next();
        push(nodes, finishNode(node, "ExportBatchSpecifier"));
    }
} else {
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
            }
} else {
                node->name = null;
            }
            push(nodes, finishNode(node, "ExportSpecifier"));
        }
    }
    return nodes;
}
Node* parseImport(Node* node) {
    next();
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
        node->kind = node->specifiers[0]->_default ? "default" : "named";
    }
    return finishNode(node, "ImportDeclaration");
}
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
        push(nodes, finishNode(node, "ImportBatchSpecifier"));
        return nodes;
    }
}
    if (tokType==_name) {
{
        auto node = startNode(); 
        node->id = parseIdent();
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
        }
} else {
            node->name = null;
        }
        node->_default = false;
        push(nodes, finishNode(node, "ImportSpecifier"));
    }
    return nodes;
}
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
Node* parseComprehension(Node* node, bool isGenerator) {
    node->blocks = std::vector<Node*>({});
    while (tokType==_for) {
        auto block = startNode(); 
        next();
        expect(_parenL);
        block->left = toAssignable(parseExprAtom());
        if (LOGICALOR(tokType!=_name,tokVal!="of")) {
unexpected();
}
        next();
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
