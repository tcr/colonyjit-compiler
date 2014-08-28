var fs = require('fs');
var falafel = require('falafel');

var out = fs.readFileSync(process.argv[2], 'utf-8');


/**
 * Abstracted functions for transform.
 */

function infuse (start, end, rep) {
  if (typeof end != 'number') {
    rep = end;
    end = start + 1;
  }

  out = out.split(/\n/).map(function (n, i) {
    if (i >= start && i < end) {
      return typeof rep == 'function' ? rep(n) : rep;
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

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function makeregexbody (chars, truecase, defaultcase, lastcase) {
  var fn = ['for (size_t i=0;i<arg.length();i++) {', 'switch ((int) arg[i]) { '];
  (chars.match(/[\s\S]\-[\s\S]|[\s\S]/g) || []).forEach(function (onecase) {
    if (onecase.length == 3) {
      fn.push('case 0x' + onecase.charCodeAt(0).toString(16) + ' ... 0x' + onecase.charCodeAt(2).toString(16) + ':');
    } else {
      fn.push('case 0x' + onecase.charCodeAt(0).toString(16) + ':');
    }
  })
  // remove duplicate cases
  fn = fn.filter(onlyUnique);
  fn.push(truecase, 'default:', defaultcase, ' } } ', lastcase);
  return fn.join(' ');
}

function makeregex (name, chars, truecase, defaultcase, lastcase) {
  return ['bool', name, '(std::string arg) {', makeregexbody(chars, truecase, defaultcase, lastcase), '};'].join(' ');
}

function makeregexlambda (chars, truecase, defaultcase, lastcase) {
  return ['([](std::string arg)->bool { ', makeregexbody(chars, truecase, defaultcase, lastcase), '})'].join(' ');
}



/**
 * Transpiling customization.
 */

// Variable types (by name).
var varTypes = {
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
  tokVal: 'std::string',
  parseIdent: 'Node*',
  liberal: 'bool',
  loopLabel: 'label_t',
  switchLabel: 'label_t',
  kind: 'std::string',
  out: 'std::string',
  id: 'Node*',
  prop: 'Node',
  cur: 'Node*',
}

// Default variable initialization.
var varDefaults = {
  input: 'std::string()',
  options: '{ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, onComment: null, ranges: false, program: null, sourceFile: "", directSourceFile: ""}',
  match: 'RegExpVector()',
  sourceFile: 'std::string()',
  word: 'std::string()',
  kind: 'std::string()',
  tokType: '{}',
  tokVal: 'std::string()',
  labels: 'std::vector<int>()',
  cur: 'nullptr',
};

// Function type definitions.
var funcTypes = {
  skipSpace: ['void'],
  readNumber: ['void', 'bool'],
  readInt: ['int', 'int', 'int'],
  readRegexp: ['void'],
  readToken_slash: ['void'],
  readToken: ['void', 'bool'],
  finishOp: ['void', 'keyword_t', 'int'],
  finishNode: ['Node*', 'Node*', 'std::string'],
  finishToken: ['void', 'keyword_t', 'std::string'],
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
  unexpected: ['Node*'],
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
  getTokenFromCode: ['bool', 'int'],
  readHexNumber: ['int'],
  readHexChar: ['int', 'int'],
  readString: ['void', 'int'],
  initTokenState: ['void'],
}

// Hoisted code.
var hoistedregex = [];

// Removes JS-only code.
replace(/[^\n]+\/\/JS/, '');

// Removes var/exports constructions for simple definitions.
replace(/var\s+(\w+)\s*=\s*exports.\w+\s*=\s*function/g, "function $1 ");
replace(/var\s+(\w+)\s*=\s*exports.\w+/g, "var $1 ");
replace(/exports.(\w+)\s*=\s*function/g, "function $1 ");
replace(/var\s+(\w+)\s*=\s*exports.\w+\s*=\s*function/, "function $1 ");
replace(/exports.(\w+)\s*=\s*(?!function).*/g, '');

// Non-trivial designated initializers not allowed.
infuse(264, 308, function (a) {
  return a.replace(/\s+var\s+(.*)/g, '/*C struct keyword_t */ $1;');
});
infuse(319, 355, function (a) {
  return a.replace(/\s+var\s+(.*)/g, '/*C struct keyword_t */ $1;');
});

// overrides
transform([
  ['VariableDeclarator', function (node) {
    // Replaces keywordTypes array with a function.
    if (node.id && node.id.source() == 'keywordTypes') {
      var source = node.init.source();
      var keys = source.match(/\"[^"]+\":\s*_\w+/g).map(function (entry) {
        return entry.match(/\"([^"]+)\":\s*_\w+/)[1];
      });
      var code = '/*C keyword_t keywordTypes(std::string arg) { ' + keys.map(function (entry) {
        return 'if (arg == ' + JSON.stringify(entry) + ') { return _' + entry + '; }';
      }).join(' ') + ' return {}; } */'

      return node.update('__ignore;' + code);
    }
  }],

  ['CallExpression', function (node) {
    // Replaces makePredicate with a dedicated function.
    if (node.callee.source() == 'makePredicate') {
      var args = node.source().replace(/^[^\(]*\(|\)$/g, '');
      args = args.replace(/"|^\s*|\s*$/g, '').split(/\s+/);
      var cases = args.map(function (str) {
        return 'arg == ' + JSON.stringify(str);
      });

      var name = 'predicate_' + hoistedregex.length;
      hoistedregex.push('bool ' + name + '(std::string arg) { return ' + cases.join(' || ') + '; }');
      return node.update(name);
    }
  }],

  ['FunctionExpression', 'FunctionDeclaration', function (node) {

    // getTokenFromCode returns null and false. Default to true.
    if (node.id && node.id.source() == 'getTokenFromCode') {
      return node.update(node.source().split(/\n/).map(function (line) {
        return line.replace(/return (\w+\(.*?\))/g, "{$1; return true;}");
      }).join('\n'));
    }

  }],
])




// Keep track of keyword constants and function prototypes.
var keywordid = 1, keywordids = {}, prototypes = [];

fs.writeFileSync(__dirname + '/output.js', out)

// AST transform.
transform([
  ['VariableDeclarator', function (node) {
    if (!node.source().match(/=/)) {
      node.update(node.source() + ' = ' + (varDefaults[node.source()] || '0'));
    } 
  }],

  ['VariableDeclaration', function (node) {
    node.update(node.declarations.map(function (d) {
      return (varTypes[d.source().replace(/(\s+=.*)?$/, '')] || 'auto') + ' ' + d.source() + '; ';
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

    // Replace strict-equality operators.
    } else if (node.operator == '===' || node.operator == '!==') {
      node.update(node.left.source() + node.operator.slice(0, -1) + node.right.source());
    }
  }],

  ['LogicalExpression', function (node) {
    if (node.operator == '||') {
      node.update('LOGICALOR(' + node.left.source() + ','+ node.right.source() + ')');
    }
  }],

  ['CallExpression', function (node) {
    if (node.callee.type == 'MemberExpression') {
      var args = [node.callee.object.source()].concat(node.arguments.map(function (arg) {
        return arg.source();
      }));
      if (args[0] == 'String') {
        args.shift();
      }
      node.update([node.callee.property.source(), '(', args.join(', '), ')'].join(''));
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
    if (node.id && ['Node', 'SourceLocation', 'makePredicate', 'setOptions', 'getLineInfo', 'tokenize', 'raise'].indexOf(node.id.source()) > -1) {
      node.update('');
      return;
    }

    node.update(node.source().replace(/^function\s*(\w+\s*)?\(([^)]*)\)/, function (_, w, a) {
      var def = funcTypes[w] || ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']; //etc
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
    node.update('std::vector<int>({' + node.elements.map(function (a) {
      return a.source()
    }).join(', ') + '})');
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
      if (node.value.source == "^[gmsiy]*$") {
        node.update(makeregexlambda('gmsiy', 'break;', 'return false;', 'return true;'));
      }

      else if (node.value.source == "^[0-7]+") {
        node.update(makeregexlambda('0-7', 'return true;', 'return false;', 'return false;'));
      }

      else if (node.value.source == "[89]") {
        node.update(makeregexlambda('89', 'return true;', 'break;', 'return false;'));
      }

      else {
        var chars = JSON.parse('"' + node.value.source.replace(/\\x(..)/g, '\\u00$1').slice(1, -1) + '"');
        var idx = hoistedregex.push(makeregex('regex_' + hoistedregex.length, chars, 'return true;', 'break;', 'return false;'))
        node.update('regex_' + (idx - 1))
      }
    }

    if (typeof node.value == 'string' && node.parent.type == 'BinaryExpression' && node.parent.operator == '+') {
      node.update('std::string(' + JSON.stringify(node.value) + ')');
    }
  }],
]);

// Populate _keyword constants with numeric ids instead of objects.
out.match(/_(\w+) = \{_id: (\d+)/g).forEach(function (a) {
  (function (_, a, b) {
    keywordids[a] = Number(b);
  }).apply(null, a.match(/_(\w+) = \{_id: (\d+)/));
});
replace(/case\s*_(\w+):/g, function (a, name) {
  return 'case ' + keywordids[name] + ':';
});

// Manual source code hacks.
replace(/new (Position)/g, "$1");
replace(/\boperator\b/g, 'opr');
replace(/std::string content = slice/g, 'content = slice') // prevent redeclaration
replace(/.length(?!\()\b/g, '.length()');
replace(/(labels|declarations|properties|params|bodyarr)\.length/g, '$1.size')
replace(/^return null;/m, 'return DBL_NULL;');
replace(/\b(node|loc|label|init|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|expression)\.(?=\w+)/g, '$1->');
replace(/(j\])\.(\w+)/g, '$1->$2');
replace("if (options.directSourceFile)", "if (options.directSourceFile.length() > 0)");
replace("keywordTypes[word]", "keywordTypes(word)");
replace(/options\.\w+\([^)]*\)\s*\|\|/g, '$1')
replace(/labels = std::vector<int>/g, 'labels = std::vector<label_t>')
replace(/(cases|consequents|empty|bodyarr|declarations|expressions|properties|params|elts) = std::vector<int>/g, '$1 = std::vector<Node*>')
replace('{key: parsePropertyName()};', '{}; prop.key = parsePropertyName();');
replace(/if \(octal\) \{/g, 'if (octal.length() > 0) {')
replace('push(labels, {name: maybeName, kind: kind})', 'push(labels, (label_t){kind: kind, name: maybeName})');
replace("push(node->properties, prop", "push(node->properties, &prop")
replace(/inFunction = strict = null;/, 'inFunction = strict = false;');
replace("switch (starttype) {", "switch (starttype._id) {")
replace("switch (tokType", "switch \(tokType._id");

// TODO: properly have tokVals.
// replace("tokVal = val;", "");
// replace(/node->opr = tokVal;/g, "");
replace(/node->value = tokVal;/g, "");
replace(/auto value = new RegExp.*/gm, "auto value = content;");

// More values that return null but shouldn't.
replace(/return (finishOp|readToken)(\(.*\))/g, "{ $1$2; return 0; }");
replace(/return (finishToken)(\(.*\))/g, "{$1$2; return; }");

// Hardcoded C code in comments.
replace(/\/\*C(.*)\*\//g, '$1'); 

// Output file.
console.log(hoistedregex.join('\n') + prototypes.join('\n') + out);
fs.writeFileSync(__dirname + '/output.js', out)
