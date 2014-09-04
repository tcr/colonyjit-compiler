#include <stdio.h>
#include  <fcntl.h>
#define JS_DEBUG(...) fprintf(stderr, __VA_ARGS__)

#include "colonyjit-parser.c"

/**************************************************************************
** BELOW IS ORIGINAL CODE
**************************************************************************/

#include "../jsparser.cpp/out/jsparser.h"
#include <stdio.h>
#include <lj_frame.h>
#include <lj_bcdump.h>
#include <lua.h>
#include <lauxlib.h>
#include <assert.h>

ExpDesc js_stack[100];
size_t js_stack_idx = 0;

ExpDesc* js_stack_push ()
{
    ExpDesc* ret = &js_stack[js_stack_idx];
    js_stack_idx++;

JS_DEBUG("push: ");
  for (int i = 0; i < js_stack_idx; i++) {
    JS_DEBUG("[] ");
  }
  JS_DEBUG("\n");
    return ret;
}

void js_stack_pop ()
{
    assert(js_stack_idx >= 1);
    js_stack_idx--;

  JS_DEBUG("pop: ");
  for (int i = 0; i < js_stack_idx; i++) {
    JS_DEBUG("[] ");
  }
  JS_DEBUG("\n");
}

ExpDesc* js_stack_top (size_t mod)
{
    ExpDesc* ret = &js_stack[js_stack_idx + mod];
    return ret;
}

typedef enum {
  JS_COND_NONE,
  JS_COND_CONSEQUENT
} js_stack_cond;

typedef struct {
  int level;
  js_stack_cond cond;
} js_stack_level;

js_stack_level js_stack_levels[100];
int js_stack_levels_idx = 0;

int js_ismethod = 0;




FuncState *my_fs;

#define my_nodematch(T) (strncmp(C.type, T, strlen(T)) == 0)
#define my_streq(A, T) (strncmp(A, T, strlen(T)) == 0)

int consequent_onstatement = 0;
int alternate_onstatement = 0;

int is_statement;

void my_onopennode (const char* type) {
  FuncState *fs = my_fs;

  // JS_DEBUG("well %s\n", type);

  if (my_streq(type, "parseExpression") && is_statement) {
    JS_DEBUG("--parseExpression (as a statement)\n");
    ExpDesc* stat = js_stack_push();
    (void) stat;
  }

  if (my_streq(type, "parseStatement")) {
    JS_DEBUG("--parseStatement\n");
    is_statement = 1;
  } else {
    is_statement = 0;
  }

  if (my_streq(type, "parseSubscripts")) {
    JS_DEBUG("--parsesubscripts\n");
    // ExpDesc* ident = js_stack_push();
    js_ismethod = 1;
  }

  if (my_streq(type, "parseExprList-next")) {
    JS_DEBUG("--parseExprList-next\n");
    ExpDesc* args = js_stack_top(0);
    expr_tonextreg(my_fs, args);
  }

  if (my_streq(type, "parseExprList")) {
    JS_DEBUG("--parseexprlist\n");
    ExpDesc* ident = js_stack_top(0);

    if (ident->k == VGLOBAL) {
      expr_tonextreg(my_fs, ident);
    }
    js_ismethod = 0;

    

    // if (!js_ismethod) {
    //   expr_tonextreg(my_fs, ident);
    // }
    // js_ismethod = 0;
    ExpDesc* args = js_stack_push();
    JS_DEBUG("---------> ident %p has a base of %d\n", ident, ident->u.s.aux);
    (void) args;
  }

  if (my_streq(type, "typeof")) {
    JS_DEBUG("--typeof\n");

    ExpDesc* ident = js_stack_top(0);
    GCstr *s = lj_str_new(my_fs->L, type, strlen(type));
    var_lookup_(my_fs, s, ident, 1);
    expr_tonextreg(my_fs, ident);
    ExpDesc* args = js_stack_push();
    (void) args;
  }

  #define JS_OP_LEFT(OP, ID) if (my_streq(type, OP)) { \
    js_ismethod = 0; \
    JS_DEBUG("-- operator " OP "\n"); \
    ExpDesc* e = js_stack_top(0); \
    bcemit_binop_left(fs, ID, e); \
    JS_DEBUG("EXPRLEFT %p\n", e); \
    ExpDesc* e2 = js_stack_push(); \
    (void) e2; \
  }

  JS_OP_LEFT("==", OPR_EQ);
  JS_OP_LEFT("!=", OPR_NE);
  JS_OP_LEFT("+", OPR_ADD);
  JS_OP_LEFT("-", OPR_SUB);
  JS_OP_LEFT("*", OPR_MUL);
  JS_OP_LEFT("/", OPR_DIV);
  JS_OP_LEFT("%", OPR_MOD);
  JS_OP_LEFT("<", OPR_LT);
  JS_OP_LEFT(">=", OPR_GE);
  JS_OP_LEFT("<=", OPR_LE);
  JS_OP_LEFT(">", OPR_GT);
  JS_OP_LEFT("&&", OPR_AND);
  JS_OP_LEFT("||", OPR_OR);

  if (my_streq(type, "if-test")) {
    JS_DEBUG("--if-test\n");

    ExpDesc* test = js_stack_push();
    (void) test;
  }

  if (my_streq(type, "if-consequent")) {
    JS_DEBUG("--if-consequent\n");

    ExpDesc* test = js_stack_top(0);
    // if (v.k == VKNIL) v.k = VKFALSE;
    bcemit_branch_t(my_fs, test);

    // ExpDesc* consequent = js_stack_push();
    // (void) consequent;
  }

  if (my_streq(type, "if-alternate")) {
    JS_DEBUG("--if-alternate\n");

    ExpDesc* test = js_stack_top(0);
    BCPos escapelist = NO_JMP;
    BCPos flist = test->f;
    jmp_append(my_fs, &escapelist, bcemit_jmp(my_fs));
    jmp_tohere(my_fs, test->f);
    test->f = escapelist;
    
    // ExpDesc* alternate = js_stack_push();
    // (void) alternate;
  }

  if (my_streq(type, "if-no-alternate")) {
    JS_DEBUG("--if-no-alternate\n");

    ExpDesc* test = js_stack_top(0);
    BCPos escapelist = NO_JMP;
    jmp_append(fs, &escapelist, test->f);
    test->f = escapelist;
  }

  if (my_streq(type, "if-end")) {
    JS_DEBUG("--if-end\n");

    ExpDesc* test = js_stack_top(0);
    jmp_tohere(fs, test->f);

    js_stack_pop();
  }
}

void my_onclosenode (struct Node_C C) {
  BCIns ins;

  // JS_DEBUG("type %s\n", C.type);
  JS_DEBUG("<- finish %s %s %s %d\n", C.type, C.name, C.raw, C.arguments);

  if (my_nodematch("Identifier")) {
    ExpDesc* ident = js_stack_top(0);
    GCstr *s = lj_str_new(my_fs->L, C.name, strlen(C.name));
    
    JS_DEBUG("identifier js_ismethod %d\n", js_ismethod);
    if (js_ismethod) {
      ExpDesc key;
      expr_init(&key, VKSTR, 0);
      key.u.sval = s;
      bcemit_method(my_fs, ident, &key);
    } else {
      var_lookup_(my_fs, s, ident, 1);
    }
  }

  if (my_nodematch("ExpressionStatement")) {
    js_ismethod = 0;
    
    ExpDesc* expr = js_stack_top(0);

    if (expr->k == VCALL) {  /* Function call statement. */
      // setbc_b(bcptr(my_fs, expr), 1);  /* No results. */
    } else {  /* Start of an assignment. */
      // vl.prev = NULL;
      // parse_assignment(ls, &vl, 1);
      JS_DEBUG("TODO: assignment\n");
    }

    expr_tonextreg(my_fs, expr);

    js_stack_pop();

    lua_assert(my_fs->framesize >= my_fs->freereg &&
         my_fs->freereg >= my_fs->nactvar);
    my_fs->freereg = my_fs->nactvar;
  }

  if ((my_nodematch("UnaryExpression") && my_streq(C._operator, "typeof"))) {
    ExpDesc* args = js_stack_top(0);
    expr_tonextreg(my_fs, args);
  }

  if (my_nodematch("CallExpression") || (my_nodematch("UnaryExpression") && my_streq(C._operator, "typeof"))) {
    ExpDesc* ident = js_stack_top(-1);
    ExpDesc* args = js_stack_top(0);

    if (C.arguments == 0) { // f().
      args->k = VVOID;
    } else {
      if (args->k == VCALL)  /* f(a, b, g()) or f(a, b, ...). */
        setbc_b(bcptr(my_fs, args), 0);  /* Pass on multiple results. */
    }

    BCReg base;

    lua_assert(ident->k == VNONRELOC);
    base = ident->u.s.info;  /* Base register for call. */
    JS_DEBUG("THIS IS THE BASE %p %d\n", ident, base);
    if (args->k != VVOID)
      expr_tonextreg(my_fs, args);
    ins = BCINS_ABC(BC_CALL, base, 2, my_fs->freereg - base);
    expr_init(ident, VCALL, bcemit_INS(my_fs, ins));
    ident->u.s.aux = base;
    my_fs->bcbase[my_fs->pc - 1].line = 0;
    my_fs->freereg = base+1;  /* Leave one result by default. */

    js_stack_pop();
  }

  if (my_nodematch("Literal")) {
    GCstr *s = NULL;
    ExpDesc* args = js_stack_top(0);
    switch (C.value_type) {
      case JS_STRING:
        expr_init(args, VKSTR, 0);
        s = lj_str_new(my_fs->L, C.value_string, strlen(C.value_string));
        args->u.sval = s;
        break;

      case JS_DOUBLE:
        expr_init(args, VKNUM, 0);
        setnumV(&args->u.nval, C.value_double);
        break;

      default:
        assert(0);
    }
  }

  if (my_nodematch("BinaryExpression")) {
    JS_DEBUG("binaryexpr %s\n", C._operator);

    ExpDesc* e1 = js_stack_top(-1);
    ExpDesc* e2 = js_stack_top(0);

    if (my_streq(C._operator, "==")) {      
      bcemit_binop(my_fs, OPR_EQ, e1, e2);
    } else if (my_streq(C._operator, "!=")) {
      bcemit_binop(my_fs, OPR_NE, e1, e2);
    } else if (my_streq(C._operator, "<")) {
      bcemit_binop(my_fs, OPR_LT, e1, e2);
    } else if (my_streq(C._operator, ">=")) {
      bcemit_binop(my_fs, OPR_GE, e1, e2);
    } else if (my_streq(C._operator, "<=")) {
      bcemit_binop(my_fs, OPR_LE, e1, e2);
    } else if (my_streq(C._operator, ">")) {
      bcemit_binop(my_fs, OPR_GT, e1, e2);
    } else if (my_streq(C._operator, "+")) {
      bcemit_binop(my_fs, OPR_ADD, e1, e2);
    } else if (my_streq(C._operator, "-")) {
      bcemit_binop(my_fs, OPR_SUB, e1, e2);
    } else if (my_streq(C._operator, "*")) {
      bcemit_binop(my_fs, OPR_MUL, e1, e2);
    } else if (my_streq(C._operator, "/")) {
      bcemit_binop(my_fs, OPR_DIV, e1, e2);
    } else if (my_streq(C._operator, "%")) {
      bcemit_binop(my_fs, OPR_MOD, e1, e2);
    } else {
      assert(0);
    }

    js_stack_pop(); // pop e2
  }


  if (my_nodematch("LogicalExpression")) {
    JS_DEBUG("logicalexpr %s\n", C._operator);

    ExpDesc* e1 = js_stack_top(-1);
    ExpDesc* e2 = js_stack_top(0);

    if (my_streq(C._operator, "&&")) {
      bcemit_binop(my_fs, OPR_AND, e1, e2);
    } else if (my_streq(C._operator, "||")) {
      bcemit_binop(my_fs, OPR_OR, e1, e2);
    } else {
      assert(0);
    }

    JS_DEBUG("EXPR %p t: %d f: %d\n", e1, e1->t, e1->f);
    JS_DEBUG("EXPR2 %p t: %d f: %d\n", e2, e2->t, e2->f);

    js_stack_pop(); // pop e2
  }

  js_ismethod = 0;
}

static char* my_input;
static size_t my_input_len = 0;

/* Entry point of bytecode parser. */
GCproto *js_parse(LexState *ls)
{
  FuncState fs;
  FuncScope bl;
  GCproto *pt;

  lua_State *L = ls->L;
#ifdef LUAJIT_DISABLE_DEBUGINFO
  ls->chunkname = lj_str_newlit(L, "=");
#else
  ls->chunkname = lj_str_newz(L, ls->chunkarg);
#endif
  setstrV(L, L->top, ls->chunkname);  /* Anchor chunkname string. */

  incr_top(L);

  my_fs = &fs;
  
  ls->level = 0;
  
  fs_init(ls, &fs);
  fs.linedefined = 0;
  fs.numparams = 0;
  fs.bcbase = NULL;
  fs.bclim = 0;
  fs.flags |= PROTO_VARARG;  /* Main chunk is always a vararg func. */
  fscope_begin(&fs, &bl, 0);
  bcemit_AD(&fs, BC_FUNCV, 0, 0);  /* Placeholder. */
  
  // EXPECTED: Remove this bit, add our code.
  /*
  lj_lex_next(ls);
  parse_chunk(ls);
  if (ls->token != TK_eof)
    err_token(ls, TK_eof);
  */
  synlevel_begin(ls);
  jsparse(my_input, strlen(my_input), my_onopennode, my_onclosenode);
  synlevel_end(ls);

  pt = fs_finish(ls, ls->linenumber);
  
  L->top--;  /* Drop chunkname. */
  lua_assert(fs.prev == NULL);
  lua_assert(ls->fs == NULL);
  lua_assert(pt->sizeuv == 0);
  return pt;
}

static int js_bcdump (lua_State *L, const void* p, size_t sz, void* ud)
{
  fwrite(p, 1, sz, stdout);
  return 0;
}

static TValue *js_cpparser(lua_State *L, lua_CFunction dummy, void *ud)
{
  LexState *ls = (LexState *)ud;
  GCproto *pt;
  GCfunc *fn;
  int bc;
  UNUSED(dummy);
  cframe_errfunc(L->cframe) = -1;  /* Inherit error function. */
  bc = lj_lex_setup(L, ls);
  // if (ls->mode && !strchr(ls->mode, bc ? 'b' : 't')) {
  //   setstrV(L, L->top++, lj_err_str(L, LJ_ERR_XMODE));
  //   lj_err_throw(L, LUA_ERRSYNTAX);
  // }
  // pt = bc ? lj_bcread(ls) : js_parse(ls);
  pt = js_parse(ls);
  lj_bcwrite(L, pt, js_bcdump, NULL, 0);
  return NULL;
}

LUA_API int js_loadx(lua_State *L, lua_Reader reader, void *data,
          const char *chunkname, const char *mode)
{
  LexState ls;
  int status;
  ls.rfunc = reader;
  ls.rdata = data;
  ls.chunkarg = chunkname ? chunkname : "?";
  ls.mode = mode;
  lj_str_initbuf(&ls.sb);
  status = lj_vm_cpcall(L, NULL, &ls, js_cpparser);
  JS_DEBUG("LUA VM EXIT: status %d\n", status);
  if (status > 0) {
    JS_DEBUG("LUA VM EXIT: %s\n", lua_tostring(L, -1));
  }
  lj_lex_cleanup(L, &ls);
  lj_gc_check(L);
  return status;
}

const char * js_luareader (lua_State *L, void *data, size_t *size)
{
  static size_t len = -1;
  *size = len == -1 ? strlen(my_input) : 0;
  len++;
  return my_input;
}

int main (int argc, char **argv)
{
  if (argc < 1) {
    JS_DEBUG("Usage: test path.js\n");
    return 1;
  }

  // Read in a file.
  FILE *fp;
  fp = fopen(argv[1], "rb");
  if (fp == NULL) {
    JS_DEBUG("no file found\n");
    return 1;
  }
  fseek(fp, 0, SEEK_END); // seek to end of file
  my_input_len = ftell(fp); // get current file pointer
  fseek(fp, 0, SEEK_SET); // seek back to beginning of file
  my_input = (char*) malloc(my_input_len);
  fread(my_input, my_input_len, 1, fp);
  fclose(fp);

  lua_State *L;
  L = luaL_newstate();

  js_loadx(L, js_luareader, NULL, "helloworld", "b");

  // free(my_input);
  return 0;
}