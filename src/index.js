var fs = require('fs');
var falafel = require('falafel');

var out = fs.readFileSync(process.argv[2], 'utf-8');

function wipe (start, end) {
  if (start < 0) {
    start = start + out.split(/\n/).length;
    end = out.split(/\n/).length
  }
  out = out.split(/\n/).map(function (n, i) {
    if (i >= start && i < end) {
      return '';
    }
    return n;
  }).join('\n');
}

function infuse (start, end, rep) {
  out = out.split(/\n/).map(function (n, i) {
    if (i >= start && i < end) {
      return rep(n);
    }
    return n;
  }).join('\n');
}

function replace (regex, str)
{
  out = out.replace(regex, str);
}

function transform (typefns)
{
  out = falafel(out, function (node) {
    // Run type functions.
    typefns.forEach(function (fn) {
      if (fn.slice(0, -1).some(function (t) {
        return typeof t == 'string' ? t == node.type : t.test(node.type)
      })) {
        fn.slice(-1)[0](node);
      }
    });
  }).toString();
}



/************************************************************/

// Default variable initialization.
var autoDefaults = {
  input: 'std::string("")',
  options: '{}',
  match: 'RegExpVector()',
  sourceFile: 'std::string("")',
  word: 'std::string("")',
  kind: 'std::string("")',
  tokType: '{}',
  labels: 'std::vector<int>()',
};

// Function type definitions.
var funcs = {
  skipSpace: ['void'],
  readNumber: ['void', 'bool'],
  readInt: ['int', 'int', 'int'],
  readRegexp: ['void'],
  readToken_slash: ['void'],
  readToken: ['void', 'bool'],
  finishOp: ['void', 'keyword_t', 'int'],
  finishNode: ['Node*', 'Node*', 'std::string'],
  finishToken: ['void', 'keyword_t', 'struct js_t'],
  eat: ['auto', 'keyword_t'],
  parseTopLevel: ['Node*', 'Node*'],
  parseParenExpression: ['Node*'],
  parseFor: ['Node*', 'Node*', 'Node*'],
  parseVar: ['Node*', 'Node*', 'bool', 'std::string'],
  parseForIn: ['Node*', 'Node*', 'Node*'],
  parseExpression: ['Node*', 'bool', 'bool'],
  parseFunction: ['Node*', 'Node*', 'bool'],
  parseBlock: ['Node*', 'bool'],
  parseMaybeAssign: ['Node*', 'bool'],
  parseMaybeConditional: ['Node*', 'bool'],
  parseExprOps: ['Node*', 'bool'],
  parseMaybeUnary: ['Node*'],
  parseExprOp: ['Node*', 'Node*', 'double', 'bool'],
  parseExprSubscripts: ['Node*'],
  parseExprAtom: ['Node*'],
  parseSubscripts: ['Node*', 'Node*', 'bool'],
  parseExprList: ['std::vector<Node*>', 'keyword_t', 'bool', 'bool'],
  parseObj: ['Node*'],
  parseNew: ['Node*'],
  parsePropertyName: ['Node*'],
  parseStatement: ['Node*'],
  parseIdent: ['Node*', 'bool'],
  isUseStrict: ['bool', 'Node*'],
  unexpected: ['void*'],
  readWord: ['void'],
  readWord1: ['std::string'],
  parseBreakContinueStatement: ['Node*', 'Node*', 'std::string'],
  parseDebuggerStatement: ['Node*', 'Node*'],
  parseDoStatement: ['Node*', 'Node*'],
  parseExpressionStatement: ['Node*', 'Node*', 'Node*'],
  parseForStatement: ['Node*', 'Node*'],
  parseFunctionStatement: ['Node*', 'Node*'],
  parseIfStatement: ['Node*', 'Node*'],
  parseLabeledStatement: ['Node*', 'Node*', 'std::string', 'Node*'],
  parseReturnStatement: ['Node*', 'Node*'],
  parseSwitchStatement: ['Node*', 'Node*'],
  parseThrowStatement: ['Node*', 'Node*'],
  parseTryStatement: ['Node*', 'Node*'],
  parseWhileStatement: ['Node*', 'Node*'],
  parseWithStatement: ['Node*', 'Node*'],
  parseEmptyStatement: ['Node*', 'Node*'],
  parseVarStatement: ['Node*', 'Node*', 'std::string'],
  startNode: ['Node*'],
}

var vars = {
  options: 'options_t',
  defaultOptions: 'options_t',
  type: 'keyword_t',
  size: 'int',
  content: 'std::string',
  word: 'std::string',
  sourceFile: 'std::string',
  tokStart: 'int',
  tokStartLoc: 'int',
  tokStartLoc1: 'int',
  tokType: 'keyword_t',
  parseIdent: 'Node*',
  liberal: 'bool',
  loopLabel: 'label_t',
  switchLabel: 'label_t',
  kind: 'std::string',
  out: 'std::string',
  id: 'Node*',
}

wipe(0, 30);           // javascript module prelude
wipe(-2);              // javascript module conclusions
wipe(109, 109+8);      // removes behaviors defines from options hash
wipe(118, 126);        // remove entire setOptions function
wipe(132, 143);        // removes "getLineInfo"
wipe(151, 182);        // removes "tokenize" export
wipe(241, 249);        // removes "raise" for our own impl
wipe(302, 317);        // TODO: not remove "keywordTypes" hash
wipe(354, 354+8);      // removes "tokTypes" export
wipe(369, 369+41);     // removes "makePredicate" constructor nonsense
wipe(1025, 1041)       // mask Node and SourceLocation with our own versions

// Removes var/exports constructions for simple definitions.
replace(/var\s+(\w+)\s*=\s*exports.\w+\s*=\s*function/g, "function $1 ");
replace(/var\s+(\w+)\s*=\s*exports.\w+/g, "var $1 ");
replace(/exports.(\w+)\s*=\s*function/g, "function $1 ");
replace(/var\s+(\w+)\s*=\s*exports.\w+\s*=\s*function/, "function $1 ");

// Keep track of keyword constants and function prototypes.
var keywordid = 1, keywordids = {}, prototypes = [];

// AST transform.
transform([
  ['VariableDeclarator', function (node) {
    if (!node.source().match(/=/)) {
      node.update(node.source() + ' = ' + (autoDefaults[node.source()] || '0'));
    } 
  }],

  ['VariableDeclaration', function (node) {
    node.update(node.declarations.map(function (d) {
      return (vars[d.source().replace(/(\s+=.*)?$/, '')] || 'auto') + ' ' + d.source() + '; ';
    }).join(' '));
  }],

  ['BinaryExpression', function (node) {
    if (node.left.source() == 'null' || node.right.source() == 'null') {
      if (node.operator == '==' || node.operator == '===') {
        node.update('ISNULL(' + node.left.source() + ')');
      }
      if (node.operator == '!=' || node.operator == '!==') {
        node.update('ISNOTNULL(' + node.left.source() + ')');
      }
    }
  }],

  ['LogicalExpression', function (node) {
    if (node.operator == '||') {
      node.update('LOGICALOR(' + node.left.source() + ','+ node.right.source() + ')');
    }
  }],

  ['SwitchCase', function (node) {
    node.update(node.source().replace(/:/, ':{') + '}');
  }],

  // make sure if statement bodies are enclosed
  ['IfStatement', function (node) {
    node.update('if (' + node.test.source() + ') {\n' + node.consequent.source() + '\n}' + (node.alternate ? ' else ' + node.alternate.source() : ''));
  }],

  ['ThisExpression', function (node) {
    node.update('THIS');
  }],

  ['FunctionExpression', 'FunctionDeclaration', function (node) {
    node.update(node.source().replace(/^function\s*(\w+\s*)?\(([^)]*)\)/, function (_, w, a) {
      var def = funcs[w] || ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']; //etc
      var args = a.split(/\s*,\s*/).filter(function (a) {
        return a;
      });

      function makeproto (def, args) {
        return def[0] + ' ' + (w||'') + '(' + args.map(function (arg, i) {
          return def[i+1] + ' ' + arg;
        }).join(', ') + ')';
      }

      // Optional boolean, integer arguments.
      var proto = makeproto(def, args);
      if (def[0] != 'auto') {
        prototypes.push(proto + ';');
        (function (args) {
          while (args.length && (def[args.length] == 'int' || def[args.length] == 'bool')) {
            prototypes.push(makeproto(def, args.slice(0, -1)) + '{ return ' + w + '(' + args.slice(0, -1).concat([
              def[args.length] == 'bool' ? 'false' : '0'
            ]).join(', ') + '); }');
            args.pop();
          }
        })(args.slice());
      }

      return proto;
    }));
  }],

  ['ForStatement', function (node) {
    node.update((node.init ? node.init.source() : '') + '; for (; ' + (node.test ? node.test.source() : '') +';' +
      (typeof node.update == 'function' ? '' : node.update.source()) + ')\n'
        + node.body.source())
  }],

  ['ArrayExpression', function (node) {
    node.update('std::vector<int>(' + node.elements.map(function (a) {
      return a.source()
    }).join(', ') + ')');
  }],

  ['ObjectExpression', function (node) {
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

    if ('sourceFile' in map || 'directSourceFile' in map) {
      map['sourceFile'] = '""';
      map['directSourceFile'] = '""';
    }

    var keys = Object.keys(map);
    if ('keyword' in map) {
      keys.sort();
    }

    node.update('{' + keys.map(function (key) {
      return key + ': ' + map[key]
    }).join(', ') + '}')
  }],

  ['Literal', function (node) {
    if (node.value instanceof RegExp) {
      node.update('RegExp(' + JSON.stringify(node.toString()) + ')');
    }

    if (typeof node.value == 'string' && node.parent.type == 'BinaryExpression' && node.parent.operator == '+') {
      node.update('std::string(' + JSON.stringify(node.value) + ')');
    }
  }],
]);

// Replce methods with functions.
replace(/([a-z.]+)\.exec\(/ig, 'exec($1, ');
replace(/([a-z.]+)\.push\(/ig, 'push($1, ');
replace(/([a-z.]+)\.pop\(/ig, 'pop($1');
replace(/([a-z.]+)\.lastIndexOf\(/ig, 'lastIndexOf($1, ');
replace(/([a-z.]+)\.test\(/ig, 'test($1, ');
replace(/([a-z.]+)\.fromCharCode\(/ig, 'fromCharCode(');
replace(/([a-z.]+)\.indexOf\(/ig, 'indexOf($1, ');
replace(/([a-z.]+)\.onComment\(/ig, 'onComment($1, ');
replace(/([a-z.]+)\.slice\(/ig, 'slice($1, ');
replace(/([a-z.]+)\.charAt\(/ig, 'charAt($1, ');
replace(/([a-z.]+)\.charCodeAt\(/ig, 'charCodeAt($1, ');

// Replace strict-mode operators.
replace(/===/g, '==');
replace(/!==/g, '!=');

// Non-trivial designated initializers not allowed.
infuse(169, 270, function (a) {
  return a.replace(/\bauto\b/g, 'struct keyword_t');
});

// TODO: no line_loc_t
replace(/new (RegExp|SyntaxError|Position)/g, "$1");
// replace(/new (SourceLocation)[^;]*)/g, "&($1)");

// TODO: replace makePredicate with a sensible approach.
replace(/auto (\w+)\s*=\s*makePredicate\((.*?)\);/g, function (_, name, args) {
  return 'bool ' + name + '(std::string arg) { return false; }';
})

// Populate _keyword constants with numeric ids instead of objects.
out.match(/_(\w+) = \{_id: (\d+)/g).forEach(function (a) {
  (function (_, a, b) {
    keywordids[a] = Number(b);
  }).apply(null, a.match(/_(\w+) = \{_id: (\d+)/));
});

// Manual source code hacks.
replace(/\boperator\b/g, 'opr');
replace(/std::string content = slice/g, 'content = slice') // prevent redeclaration
replace(/.length\b/g, '.length()');
replace(/^return null;/m, 'return DBL_NULL;');
replace(/RegExp\((.*?)\)\.(test|exec)\(/g, '$2(RegExp($1), ');
replace(/slice\((.*?)\)\.(indexOf)\(/g, '$2(slice($1), ');
replace(/\b(node|loc|label|init|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|expression)\.(\w+)/g, '$1->$2');
replace(/\b(node|loc|label|init|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|expression)\.(\w+)/g, '$1->$2');
replace(/(j\])\.(\w+)/g, '$1->$2');
replace("switch (starttype) {", "switch (starttype._id) {")
replace("if (options.directSourceFile)", "if (options.directSourceFile.length() > 0)");
replace("keywordTypes[word]", "keywordTypes(word)");
replace(/options.\w+\([^)]*\)\s*(;?)/g, '0$1')
replace(/(labels|declarations|properties|params|bodyarr)\.length/g, '$1.size')
replace(/labels = std::vector<int>/g, 'labels = std::vector<label_t>')
replace(/(cases|consequents|empty|bodyarr|declarations|expressions|properties|params|elts) = std::vector<int>/g, '$1 = std::vector<Node*>')
replace(/auto cur = 0;  auto sawDefault/, 'Node* cur = nullptr;  auto sawDefault')
replace(/auto prop\b/, 'Node prop');
replace('push(labels, {name: maybeName, kind: kind})', 'push(labels, (label_t){kind: kind, name: maybeName})');
replace('{key: parsePropertyName()};', '{}; prop.key = parsePropertyName();');
replace(/if \(octal\) \{/g, 'if (octal.length() > 0) {')
replace("push(node->properties, prop", "push(node->properties, &prop")
replace("switch \(tokType", "switch \(tokType._id");
replace("tokVal = val;", "");
replace(/return (readRegexp|readWord|finishToken|readToken_caret|readToken|readToken_dot|readHexNumber|readNumber|finishOp|readToken_mult_modulo|readToken_slash)(\(.*\))/g, "$1$2; return");
replace(/inFunction = strict = null;/, 'inFunction = strict = false;');
replace(/case\s*_(\w+):/g, function (a, name) {
  return 'case ' + keywordids[name] + ':';
});

// Hardcoded C code in comments.
replace(/\/\*C(.*)\*\//g, '$1'); 

// Output file.
console.log(prototypes.join('\n') + out);
