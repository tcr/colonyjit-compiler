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
out = wipe(out, 109, 109+8); // removes behaviors defines

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
  word: '""',
  sourceFile: '""'
};

// function makeregexp (a) {
//       return a.replace(/\/(.*?)\//, 'new RegExp("$1")');
// }
// out = infuse(out, 435, 436, makeregexp);
// out = infuse(out, 443, 444, makeregexp);
// out = infuse(out, 448, 449, makeregexp);
// out = infuse(out, 864, 865, makeregexp);
// out = infuse(out, 845, 846, makeregexp);
// out = infuse(out, 784, 785, makeregexp);

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
    }
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
  if (node.value instanceof RegExp) {
    node.update('RegExp(' + JSON.stringify(node.toString()) + ')');
  }
  // if (typeof node.value == 'string' && node.value == '') {
  //   node.update('std::string(' + JSON.stringify(node.value) + ')');
  // }
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

// out = out.replace(/((?!\/).)\/([^\/]+?)\//gm, '$1new RegExp("$2")');

// function explodeauto (a) {
//       if (!a.match(/\b(var|auto)\b/)) {
//             return a;
//       }
//       return a.replace(/(var|auto)\s*/g, '').replace(/;\s*$/, '').split(/\s*,\s*/).map(function (a) {
//             return 'auto ' + (a.match(/=/) ? a : a + ' = ' + this[a.replace(/^\s*|\s*$/, '')]) + ';';
//       }.bind(this)).join(' ');
// }

// out = out.replace(/(\.length)\b/, '$1()');

// var protos = [];

// out = out.replace(/\bfunction(\s+\w+)?\s*\((.*?)\)/g, function (_, name, args) {
//       var ret = 'function ' + (name || '') + ' (' + args.split(/\s*,\s*/).filter(function (a) {
//             return a.length;
//       }).map(function (a) {
//             return 'auto ' + a;
//       }).join(', ') + ')';
//       return ret;
// });
// out = out.replace(/\bvar\b/g, 'auto');
// out = out.replace(/exports.(\w+)\s+=\s+(function)?\b/g, 'auto $1 ');
// out = out.replace(/\bfunction\b/g, 'auto');
// out.match(/\b(function|auto)\s*\w+\s*\((.*)\)/g).forEach(function (a) {
//       protos.push(a);
// });
// out = out.replace(/\b(auto\s+\w+)\s*=\s*auto\s+\w+\b/g, '$1');

// out = out.replace(/\b(\w+)\:/g, '.$1 = ');
// out = out.replace(/case \.(\w+)\s*=/g, 'case $1:');
// out = out.replace(/\.default\s*=/g, 'default:');

// out = out.replace(/\bInfinity\b/, 'INFINITY');


// out = infuse(out, 39, 40, explodeauto.bind({
//       options: '((options_t){})',
//       input: '((std::string)"")', inputLen: '0', sourceFile: '""'}));
// out = infuse(out, 922, 923, explodeauto.bind({word: '""'}));
// out = infuse(out, 912, 913, explodeauto.bind({containsEsc: 'false'}));
// out = infuse(out, 187, 240, explodeauto.bind({
//       tokType: 'NULL',
//       tokVal: 'NULL',
//       tokRegexpAllowed: 'false',
//       tokCurLine: '0',
//       tokLineStart: '0',
//       lastStart: '0',
//       lastEnd: '0',
//       lastEndLoc: '0',
//       inFunction: 'false',
//       labels: 'false',
//       strict: 'false',
// }));
// out = infuse(out, 766, 767, explodeauto.bind({
//       escaped: 'false',
//       inClass: 'false'
// }))


// // regexp constructor
// out = out.replace(/new RegExp\((.*?)\)\.(\w+)\(/g, '$2($1, ')
// out = out.replace(/new RegExp\((.*?)\)/g, 'regexp($1)')

// // no designated initializers,
// out = out.replace(/\.type\s*=\s*/g, '');
// out = infuse(out, 265, 267, function (a) {
//       return a.replace(/\bauto\b/, 'struct general_t');
// });

// out = out.replace(/(\[\])/, 'std::vector<std::string>()');
// out = out.replace(/exports.defaultOptions = /, '');

// out = infuse(out, 51, 53, explodeauto.bind({
//       defaultOptions: 'options_t'
// }));

// console.log('#include "out-inc.h"\n' + protos.join('; ') + ';' + out.replace(/^\s*?\n/, ''));

out = out.replace(/auto\s+(\w+)\s*=\s*exports.\w+\s*=\s*auto/g, "auto $1 ")
out = out.replace(/exports.(\w+)\s*=\s*auto/g, "auto $1 ")
out = out.replace(/auto\s+(\w+)\s*=\s*exports.\w+/, "auto $1 ")

out = out.replace(/([a-z.]+)\.call\(/ig, 'call($1, ');
out = out.replace(/([a-z.]+)\.exec\(/ig, 'exec($1, ');
out = out.replace(/([a-z.]+)\.split\(/ig, 'split($1, ');
out = out.replace(/([a-z.]+)\.push\(/ig, 'push($1, ');
out = out.replace(/([a-z.]+)\.pop\(/ig, 'pop($1, ');
out = out.replace(/([a-z.]+)\.lastIndexOf\(/ig, 'lastIndexOf($1, ');
out = out.replace(/([a-z.]+)\.stringify\(/ig, 'stringify(');
out = out.replace(/([a-z.]+)\.sort\(/ig, 'sort($1, ');
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
out = infuse(out, 200, 290, function (a) {
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
out = out.replace(/auto content = slice/g, 'content = slice')
out = out.replace(/.length\b/g, '.length()')
out = out.replace('tokPos - start != len) return null;', 'tokPos - start != len) return DBL_NULL;');
out = out.replace(/RegExp\((.*?)\)\.(test|exec)\(/g, '$2(RegExp($1), ');
out = out.replace(/THIS\.end = null/g, 'THIS.end = DBL_NULL');
out = out.replace(/\bnode\.(\w+)/g, 'node->$1');
out = out.replace(/\bloc\.(\w+)/g, 'loc->$1');
out = out.replace(/case\s*_(\w+):/g, function (a, name) {
  return 'case ' + keywordids[name] + ':';
});
out = out.replace("if (options.directSourceFile)", "if (options.directSourceFile.length() > 0)");

// typify
out = out.replace(/auto options/g, 'options_t options')
out = out.replace(/auto defaultOptions/g, 'options_t defaultOptions')
out = out.replace(/auto lineBreak/g, 'struct regexp_t lineBreak')
out = out.replace(/auto nonASCIIidentifierStartChars/g, 'std::string nonASCIIidentifierStartChars')
out = out.replace(/auto nonASCIIidentifierChars/g, 'std::string nonASCIIidentifierChars')
out = out.replace(/auto match/g, 'RegExpVector match')
out = out.replace(/auto skipSpace/g, 'void skipSpace');
out = out.replace(/auto readNumber/g, 'void readNumber');
out = out.replace(/auto startsWithDot/g, 'bool startsWithDot');
out = out.replace(/auto finishToken/g, 'void finishToken');
out = out.replace(/auto readRegexp/g, 'void readRegexp');
out = out.replace(/auto finishOp/g, 'void finishOp');
out = out.replace(/auto type/g, 'keyword_t type');
out = out.replace(/auto size/g, 'int size');
out = out.replace(/auto content/g, 'std::string content');
out = out.replace(/auto readWord1/g, 'std::string readWord1');
out = out.replace(/auto word/g, 'std::string word');
out = out.replace(/auto sourceFile/g, 'std::string sourceFile');
out = out.replace(/auto tokStartLoc/g, 'int tokStartLoc');
out = out.replace(/auto tokStart/g, 'int tokStart');
out = out.replace(/auto tokEnd\b/g, 'int tokEnd');


console.log('#include "out-inc.h"\n' + out);
