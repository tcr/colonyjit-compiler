var fs = require('fs');
var falafel = require('falafel');
var typedacorn = require('typedast');


var input = fs.readFileSync(process.argv[2], 'utf-8');

// Replace "export" statements.
input = input.replace(/^\s*export /mg, '') + '\nvar _dummy = null; export = _dummy;';

// Remove checkLVal lines.
input = input.replace(/^\s*checkLVal.*/mg, '');
input = input.replace(/^\s*(onToken|onComment):.*/mg, '');
input = input.replace(/^\s*(var startLoc).*/mg, '');
input = input.replace(/^\s*(for \(var kw in keywordTypes\)).*/mg, '');

// Variable types (by name).
var varTypes = {
  cur: 'Node*',
  token: 'keyword_t',
  tokVal: 'std::string',
  labels: 'std::vector<label_t>',
  oldLabels: 'std::vector<label_t>',
}

// Default variable initialization.
var varDefaults = {
  options: '{ecmaVersion: 5, strictSemicolons: false, allowTrailingCommas: true, forbidReserved: "", allowReturnOutsideFunction: false, locations: false, ranges: false, program: null, sourceFile: "", directSourceFile: ""}',
  match: 'RegExpVector()',
  tokType: '{}',
  labels: 'std::vector<int>()',
  cur: 'nullptr',
  exprList: 'std::vector<Node*>()',
};

// Function type definitions.
var funcTypes = {
  finishToken: ['int', 'keyword_t', 'std::string'],
};

// Functions that we'll implement ourselves.
var funcIgnore = ['toAssignable', 'isUseStrict', 'has', 'checkPropClash', 'checkFunctionParam', 'checkLVal', 'Node', 'SourceLocation', 'makePredicate', 'setOptions', 'getLineInfo', 'tokenize', 'raise', 'getCurrentToken'];


// Worker.

typedacorn.compile(input, function (err, data) {

  var out = data.javascript;
  var getType = data.getType;

  /**
   * Abstracted functions for transform.
   */

  function replace (regex, str)
  {
    var out2 = out.replace(regex, str);
    if (out == out2) {
      throw new Error('Redundant replace.');
    }
    out = out2;
  }

  function transform (typefns)
  {
    out = falafel(out, {
      loc: true
    }, function (node) {
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


  /**
   * Transpiling customization.
   */

  // Keep track of keyword constants and function prototypes.
  var keywordid = 1, keywordids = {}, prototypes = [];
  var hoistedregex = [];
  var typeslist = [];

  falafel(out, {
    loc: true
  }, function (node) {
    if (node.type == 'VariableDeclarator') {
      var id = node.id.source();
      var type = adjusttype(getType(node.id));
      typeslist.push([id, (varTypes[id] || (type && !isinvalidtype(type) ? type : 'auto'))])
    }

    if (node.type == 'FunctionExpression' || node.type == 'FunctionDeclaration') {
      var type = getType(node);
      if (node.id) {
        var id = node.id.source();
        if (type && !funcTypes[id]) {
          var fntype = type.map(adjusttype);
          if (!fntype.some(isinvalidtype)) {
            funcTypes[id] = fntype;
          }
        }
      }
    }
  });

  // Removes JS-only code.
  // replace(/[^\n]+\/\/JS/, '');

  replace(/var _dummy [\s\S]+/, '');
  replace(/var (Position|Node|SourceLocation) = \(function.*$/gm, '');
  replace(/return (Position|Node|SourceLocation);[\s\n]*\}\)\(\);/g, '\n');

  replace(/__c__\('([^']+)'\)/g, '/*C $1 */');

  fs.writeFileSync(__dirname + '/output.js', out)

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
  ])

  fs.writeFileSync(__dirname + '/output.js', out)

  // AST transform.
  transform([
    ['VariableDeclarator', function (node) {
      var id = node.id.source();
      if (id == '__ignore') {
        return node.update('');
      }
      var item = typeslist.filter(function (t) {
        return t[0] == id;
      })[0];
      if (item) {
        typeslist.splice(typeslist.indexOf(item), 1);
      }
      var type = item ? item[1] : 'auto';
      var init = node.init ?
        node.init.source() : varDefaults[id] || (
          type == 'std::string' ? 'std::string()'
          : '0'
          );
      node.update(type + ' ' + id + ' = ' + init + '; ');
    }],

    ['VariableDeclaration', function (node) {
      node.update(node.declarations.map(function (d) {
        return d.source();
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
      // make sure if statement bodies are enclosed
      node.update(node.source().replace(/:/, ':{') + '}');
    }],

    ['IfStatement', function (node) {
      if (node.test.source() == 'options.locations' || node.test.source() == 'options.onComment' || node.test.source() == 'options.onToken') {
        node.update('');
      }

      // make sure if statement bodies are enclosed
      else {
        node.update('if (' + node.test.source() + ') {\n' + node.consequent.source() + '\n}' + (node.alternate ? ' else ' + node.alternate.source() : ''));
      }
    }],

    ['ThisExpression', function (node) {
      node.update('THIS');
    }],

    ['ReturnStatement', function (node) {
      // JavaScript void is cast to useless integers.
      if (!node.argument) {
        node.update('return 0;');
      }
    }],

    ['FunctionExpression', 'FunctionDeclaration', function (node) {
      if (node.id && funcIgnore.indexOf(node.id.source()) > -1) {
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

    ['ExpressionStatement', function (node) {
      // Eliminate "use strict"
      if (node.expression.type == 'Literal') {
        node.update('');
      }
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

      else if (typeof node.value == 'string' && node.parent.type == 'BinaryExpression' && node.parent.operator == '+') {
        node.update('std::string(' + JSON.stringify(node.value) + ')');
      }

      // Eliminate 'string' for "string"
      else if (typeof node.value == 'string') {
        node.update(JSON.stringify(node.value));
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
  replace(/std::string content = slice/g, 'content = slice') // prevent redeclaration
  replace(/.length(?!\()\b/g, '.length()');
  replace(/\.(default|static|operator)\b/g, '._$1'); // default is an inappropriate key name
  replace(/(labels|declarations|properties|params|bodylist|exprList)\.length/g, '$1.size')
  replace(/^return null;/m, 'return DBL_NULL;');
  replace(/\b(node|loc|label|method|elem|init|prop|cur|clause|param|expr|decl|id|argument|val|key|other|body|stmt|classBody|expression|block|(?:specifiers|exprList)\[(\d+|i)\])\.(?=\w+)/g, '$1->');
  replace("if (options.directSourceFile)", "if (options.directSourceFile.length() > 0)");
  replace("keywordTypes[word]", "keywordTypes(word)");
  replace(/labels = std::vector<int>/g, 'labels = std::vector<label_t>');
  replace(/(parseArrowExpression|->(?:quasis|specifiers) =|exprList =)(.*)std::vector<int>/g, '$1$2std::vector<Node*>');
  replace(/(cases|consequents?|exprList|nodes|blocks|empty|bodylist|declarations|expressions|properties|params|elts|defaults) = std::vector<int>/g, '$1 = std::vector<Node*>')
  replace(/if \(octal\) \{/g, 'if (octal.length() > 0) {')
  replace('push(labels, {name: maybeName, kind: kind})', 'push(labels, (label_t){kind: kind, name: maybeName})');
  replace("switch (starttype) {", "switch (starttype._id) {")
  replace("switch (tokType", "switch \(tokType._id");

  // TODO: properly have tokVals.
  replace(/node->value = tokVal;/g, "");
  replace(/auto value = new RegExp.*/gm, "auto value = content;");

  // Hardcoded C code in comments.
  replace(/\/\*C(.*)\*\//g, '$1');

  // Output file.
  console.log(hoistedregex.join('\n') + prototypes.join('\n') + out);
  fs.writeFileSync(__dirname + '/output.js', out)
});

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

function adjusttype (t) {
  if (t == 'Node') return 'Node*';
  if (t == 'Token') return 'keyword_t';
  if (t == 'Array' || t == '[]') return 'std::vector<Node*>';
  if (t == 'boolean') return 'bool';
  if (t == 'string') return 'std::string';
  if (t == 'number') return 'int';
  if (t == 'void') return 'int';
  if (t == 'Options') return 'options_t';
  if (t == 'Label') return 'label_t';
  if (t == 'Position') return 'int';
  return t;
}

function isinvalidtype (t) {
  return ['any', '__object', 'Function', 'RegExp', 'RegExpExecArray', 'raise'].indexOf(t) > -1 || t.indexOf('[]') > -1;
}
