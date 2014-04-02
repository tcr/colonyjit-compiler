var fs = require('fs');
var falafel = require('falafel');

var out = fs.readFileSync('./acorn_mod.js', 'utf-8');

function wipe (out, start, end) {
  if (start < 0) {
    start = start + out.split(/\n/).length;
    end = out.split(/\n/).length
  }
  return out.split(/\n/).map(function (n, i) {
    if (i >= start && i < end) {
      return '';
    }
    return n;
  }).join('\n');
}

function infuse (out, start, end, rep) {
  return out.split(/\n/).map(function (n, i) {
    if (i >= start && i < end) {
      return rep(n);
    }
    return n;
  }).join('\n');
}

out = wipe(out, 0, 30); out = wipe(out, -2);
out = wipe(out, 132, 143); // removes behaviors defines
out = wipe(out, 109, 109+8); // removes behaviors defines

out = wipe(out, 241, 248); // removes raise
out = wipe(out, 354, 354+8); // removes external toktypes
out = wipe(out, 369, 369+38); // makePredicate
out = wipe(out, 119, 125); // setOptions
out = wipe(out, 151, 181); // removes tokenize entirely

out = wipe(out, 1011, 1023) // wipe node_[loc_]t

out = wipe(out, 303, 313); // TEMP!! hash

var autoDefaults = {
  input: 'std::string("")',
  options: '{}',
  match: 'RegExpVector()',
  tokType: '{}',
  labels: 'std::vector<int>()',
};


var keywordid = 1, keywordids = {};

out = falafel(out, function (node) {
  if (node.type == 'VariableDeclarator') {
    if (!node.source().match(/=/)) {
      node.update(node.source() + ' = ' + (autoDefaults[node.source()] || '0'));
    }
  }
  if (node.type == 'VariableDeclaration') {
    node.update(node.declarations.map(function (d) {
      return 'auto ' + d.source() + '; ';
    }).join(' '));
  }
  if (node.type == 'BinaryExpression') {
    if (node.left.source() == 'null' || node.right.source() == 'null') {
      if (node.operator == '==' || node.operator == '===') {
        node.update('ISNULL(' + node.left.source() + ')');
      }
      if (node.operator == '!=' || node.operator == '!==') {
        node.update('ISNOTNULL(' + node.left.source() + ')');
      }
    }
  }
  if (node.type == 'SwitchCase') {
    node.update(node.source().replace(/:/, ':{') + '}');
  }
  if (node.type == 'FunctionExpression') {
    node.update(node.source().replace(/^function\s*(\w+\s*)?\(([^)]*)\)/, function (_, w, a) {
      return 'auto ' + (w||'') + '(' + a.split(/\s*,\s*/).map(function (arg) {
        return 'auto ' + arg;
      }).join(', ') + ')';
    }));
  }
  if (node.type == 'FunctionDeclaration') {
    node.update(node.source().replace(/^function\s*(\w+\s*)?\(([^)]*)\)/, function (_, w, a) {
      return 'auto ' + (w||'') + '(' + a.split(/\s*,\s*/).filter(function (a) {
        return a;
      }).map(function (arg) {
        return 'auto ' + arg;
      }).join(', ') + ')';
    }));
  }
  if (node.type == 'IfStatement') {
    // make sure if statement bodies are enclosed
    node.update('if (' + node.test.source() + ') {\n' + node.consequent.source() + '\n}');
  }
  if (node.value instanceof RegExp) {
    node.update('RegExp(' + JSON.stringify(node.toString()) + ')');
  }
  if (typeof node.value == 'string' && node.parent.type == 'BinaryExpression' && node.parent.operator == '+') {
    node.update('std::string(' + JSON.stringify(node.value) + ')');
  }
  if (node.type.match(/^ForStatement/)) {
    node.update((node.init ? node.init.source() : '') + '; for (; ' + (node.test ? node.test.source() : '') +';' +
      (typeof node.update == 'function' ? '' : node.update.source()) + ')\n'
        + node.body.source())
  }
  if (node.type.match(/^ArrayExpression/)) {
    node.update('std::vector<int>(' + node.elements.map(function (a) {
      return a.source()
    }).join(', ') + ')');
  }

  if(node.type == 'ThisExpression') {
  node.update('THIS');
}

  if (node.type.match(/^ObjectExpression/)) {
    var map = {};
    node.properties.forEach(function (a) {
      map[a.key.source()] = a.value.source();
    })
    if ('keyword' in map || 'binop' in map || 'beforeExpr' in map || 'isUpdate' in map || 'type' in map) {
      map['_id'] = keywordid++;
      map['atomValue'] = map['atomValue'] ? 'ATOM_' + map['atomValue'].toUpperCase() : 'ATOM_NULL';
      map['keyword'] = map['keyword'] || '""'
      map['beforeExpr'] = map['beforeExpr'] || 'false'
      map['binop'] = map['binop'] || '-1';
      map['isAssign'] = map['isAssign'] || 'false'
      map['isLoop'] = map['isLoop'] || 'false'
      map['isUpdate'] = map['isUpdate'] || 'false'
      map['prefix'] = map['prefix'] || 'false'
      map['postfix'] = map['postfix'] || 'false'
      map['type'] = map['type'] || '""'
    }

    var keys = Object.keys(map);
    if ('keyword' in map) {
      keys.sort();
    }

    node.update('{' + keys.map(function (key) {
      return key + ': ' + map[key]
    }).join(', ') + '}')
  }
}).toString()

out = out.replace(/auto\s+(\w+)\s*=\s*exports.\w+\s*=\s*auto/g, "auto $1 ")
out = out.replace(/exports.(\w+)\s*=\s*auto/g, "auto $1 ")
out = out.replace(/auto\s+(\w+)\s*=\s*exports.\w+/, "auto $1 ")

out = out.replace(/([a-z.]+)\.exec\(/ig, 'exec($1, ');
out = out.replace(/([a-z.]+)\.push\(/ig, 'push($1, ');
out = out.replace(/([a-z.]+)\.pop\(/ig, 'pop($1');
out = out.replace(/([a-z.]+)\.lastIndexOf\(/ig, 'lastIndexOf($1, ');
out = out.replace(/([a-z.]+)\.test\(/ig, 'test($1, ');
out = out.replace(/([a-z.]+)\.fromCharCode\(/ig, 'fromCharCode(');
out = out.replace(/([a-z.]+)\.indexOf\(/ig, 'indexOf($1, ');
out = out.replace(/([a-z.]+)\.onComment\(/ig, 'onComment($1, ');
out = out.replace(/([a-z.]+)\.slice\(/ig, 'slice($1, ');
out = out.replace(/([a-z.]+)\.charAt\(/ig, 'charAt($1, ');
out = out.replace(/([a-z.]+)\.charCodeAt\(/ig, 'charCodeAt($1, ');

// operators
out = out.replace(/===/g, '==');
out = out.replace(/!==/g, '!=');

// non-trivial designated initializers not allowed
out = infuse(out, 198, 290, function (a) {
  return a.replace(/\bauto\b/g, 'struct keyword_t');
});

// todo no line_loc_t
out = out.replace(/new (RegExp|SyntaxError|line_loc_t)/g, "$1");

out = out.replace(/auto (\w+)\s*=\s*makePredicate\("([^"]+?)"\);/g, function (_, name, args) {
  return 'bool ' + name + '(std::string arg) { return false; }';
})

// populate keywordids
out.match(/_(\w+) = \{_id: (\d+)/g).forEach(function (a) {
  (function (_, a, b) {
    keywordids[a] = Number(b);
  }).apply(null, a.match(/_(\w+) = \{_id: (\d+)/));
});

// manual hacks
out = out.replace(/\boperator\b/g, 'opr');
out = out.replace(/auto content = slice/g, 'content = slice')
out = out.replace(/.length\b/g, '.length()');
out = out.replace(/^return null;/m, 'return DBL_NULL;');
out = out.replace(/RegExp\((.*?)\)\.(test|exec)\(/g, '$2(RegExp($1), ');
out = out.replace(/slice\((.*?)\)\.(indexOf)\(/g, '$2(slice($1), ');
out = out.replace(/\b(node|loc|label|init|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|expression)\.(\w+)/g, '$1->$2');
out = out.replace(/\b(node|loc|label|init|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|expression)\.(\w+)/g, '$1->$2');
out = out.replace(/(j\])\.(\w+)/g, '$1->$2');
out = out.replace(/case\s*_(\w+):/g, function (a, name) {
  return 'case ' + keywordids[name] + ':';
});
out = out.replace("switch (starttype) {", "switch (starttype._id) {")
out = out.replace("if (options.directSourceFile)", "if (options.directSourceFile.length() > 0)");
out = out.replace("keywordTypes[word]", "keywordTypes(word)");
out = out.replace(/options.behaviors.\w+\([^)]*\)\s*(\|\|)?;?/g, '')
out = out.replace(/(labels|declarations|properties|params|bodyarr)\.length/g, '$1.size')
out = out.replace(/labels = std::vector<int>/g, 'labels = std::vector<label_t>')
out = out.replace(/(cases|consequents|empty|bodyarr|declarations|expressions|properties|params|elts) = std::vector<int>/g, '$1 = std::vector<node_t*>')
out = out.replace(/auto cur = 0;  auto sawDefault/, 'node_t* cur = nullptr;  auto sawDefault')
out = out.replace(/auto prop\b/, 'node_t prop');
out = out.replace('push(labels, {name: maybeName, kind: kind})', 'push(labels, (label_t){kind: kind, name: maybeName})');
out = out.replace('{key: parsePropertyName()};', '{}; prop.key = parsePropertyName();');
out = out.replace('if (octal) {', 'if (octal.length() > 0) {')

// typify
out = out.replace(/auto options/g, 'options_t options')
out = out.replace(/auto defaultOptions/g, 'options_t defaultOptions')
out = out.replace(/auto skipSpace/g, 'void skipSpace');
out = out.replace(/auto readNumber/g, 'void readNumber');
out = out.replace(/auto readInt\b.*/gm, 'int readInt(int radix, int len) {');
out = out.replace(/auto startsWithDot/g, 'bool startsWithDot');
out = out.replace(/auto readRegexp/g, 'void readRegexp');
out = out.replace(/auto readToken_slash\b.*/m, 'void readToken_slash (...) {');
out = out.replace(/auto finishOp/g, 'void finishOp');
out = out.replace(/auto type/g, 'keyword_t type');
out = out.replace(/auto size/g, 'int size');
out = out.replace(/auto content/g, 'std::string content');
out = out.replace(/auto readWord1/g, 'std::string readWord1');
out = out.replace(/auto word/g, 'std::string word');
out = out.replace(/auto sourceFile/g, 'std::string sourceFile');
out = out.replace(/auto tokStart/g, 'int tokStart');
out = out.replace(/auto tokType\b/g, 'keyword_t tokType');
out = out.replace(/auto unexpected\b/g, 'void unexpected');
out = out.replace(/auto parseIdent\b/g, 'node_t* parseIdent');
out = out.replace(/auto liberal\b/g, 'bool liberal');
out = out.replace(/auto finishNode.*/m, 'node_t* finishNode(node_t* node, std::string type) {')
out = out.replace(/auto loopLabel\b/, 'label_t loopLabel');
out = out.replace(/auto switchLabel\b/, 'label_t switchLabel');
out = out.replace(/auto kind\b/g, 'std::string kind');

out = out.replace(/auto parseParenExpression/, 'node_t* parseParenExpression');
out = out.replace(/auto parseFor\b.*/m, 'node_t* parseFor(node_t* node, node_t* init) {')
out = out.replace(/auto parseVar\b.*/m, 'node_t* parseVar(node_t* node, bool noIn) {')
out = out.replace(/auto parseForIn\b.*/m, 'node_t* parseForIn(node_t* node, node_t* init) {')
out = out.replace(/auto parseExpression\b.*/m, 'node_t* parseExpression(bool noComma, bool noIn) {')
out = out.replace(/auto parseFunction\b.*/m, 'node_t* parseFunction(node_t* node, bool isStatement) {')
out = out.replace(/auto parseBlock\b.*/m, 'node_t* parseBlock(bool allowStrict) {');
out = out.replace(/auto parseMaybeAssign\b.*/m, 'node_t* parseMaybeAssign(bool noIn) {');
out = out.replace(/auto parseMaybeConditional\b.*/m, 'node_t* parseMaybeConditional(bool noIn) {');
out = out.replace(/auto parseExprOps\b.*/m, 'node_t* parseExprOps(bool noIn) {');
out = out.replace(/auto parseMaybeUnary\b.*/m, 'node_t* parseMaybeUnary() {');
out = out.replace(/auto parseExprOp\b.*/m, 'node_t* parseExprOp(node_t* left, double minPrec, bool noIn) {');
out = out.replace(/auto parseExprSubscripts\b.*/m, 'node_t* parseExprSubscripts() {');
out = out.replace(/auto parseExprAtom\b.*/m, 'node_t* parseExprAtom() {');
out = out.replace(/auto parseSubscripts\b.*/m, 'node_t* parseSubscripts(node_t* base, bool noCalls) {');
out = out.replace(/auto parseExprList\b.*/m, 'std::vector<node_t*> parseExprList(keyword_t close, bool allowTrailingComma, bool allowEmpty) {');
out = out.replace(/auto parseObj\b.*/m, 'node_t* parseObj() {');
out = out.replace(/auto parseNew\b.*/m, 'node_t* parseNew() {');
out = out.replace(/auto parsePropertyName\b.*/m, 'node_t* parsePropertyName() {');
out = out.replace(/auto isUseStrict\b.*/m, 'bool isUseStrict(node_t* stmt) {');
out = out.replace(/auto out\b.*/m, 'std::string out');

out = out.replace("push(node->properties, prop", "push(node->properties, &prop")
out = out.replace("switch \(tokType", "switch \(tokType._id");
out = out.replace("tokVal = val;", "");

out = out.replace(/return (readRegexp|readWord|finishToken|readToken_caret|readToken_dot|readHexNumber|readNumber|finishOp|readToken_mult_modulo|readToken_slash)/g, "$1");

console.log('#include "out-inc.h"\n' + out);
