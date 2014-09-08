#include <stdio.h>
#include <fcntl.h>
#include <stdio.h>
#include <assert.h>

#include <lj_frame.h>
#include <lj_bcdump.h>
#include <lua.h>
#include <lauxlib.h>

#include "parser/out/jsparser.h"

#define JS_DEBUG(...) fprintf(stderr, __VA_ARGS__)
#include "colonyjit-parser.c"

/*
 * Expression stack.
 */

ExpDesc js_stack[100];
size_t js_stack_idx = 0;

ExpDesc* js_stack_push()
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

void js_stack_pop()
{
    assert(js_stack_idx >= 1);
    js_stack_idx--;

    JS_DEBUG("pop: ");
    for (int i = 0; i < js_stack_idx; i++) {
        JS_DEBUG("[] ");
    }
    JS_DEBUG("\n");
}

ExpDesc* js_stack_top(size_t mod)
{
    ExpDesc* ret = &js_stack[js_stack_idx + mod];
    return ret;
}

/* 
 * Increment registers in written instructions.
 */

static void increment_registers(BCIns* ins, int pos)
{
    switch (bc_op(*ins)) {
    // A and B
    case BC_ADDVN:
    case BC_SUBVN:
    case BC_MULVN:
    case BC_DIVVN:
    case BC_MODVN:
    case BC_ADDNV:
    case BC_SUBNV:
    case BC_MULNV:
    case BC_DIVNV:
    case BC_MODNV:
    case BC_TGETS:
    case BC_TGETB:
    case BC_TSETS:
    case BC_TSETB:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        break;

    // A and B and D
    case BC_ADDVV:
    case BC_SUBVV:
    case BC_MULVV:
    case BC_DIVVV:
    case BC_MODVV:
    case BC_POW:
    case BC_CAT:
    case BC_TGETV:
    case BC_TSETV:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        setbc_d(ins, bc_d(*ins) >= pos ? bc_d(*ins) + 1 : bc_d(*ins));
        break;

    // A and D
    case BC_ISLT:
    case BC_ISGE:
    case BC_ISLE:
    case BC_ISGT:
    case BC_ISEQV:
    case BC_ISNEV:
    case BC_ISTC:
    case BC_ISFC:
    case BC_MOV:
    case BC_NOT:
    case BC_UNM:
    case BC_LEN:
    case BC_KNIL:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_d(ins, bc_d(*ins) >= pos ? bc_d(*ins) + 1 : bc_d(*ins));
        break;

    // D
    case BC_IST:
    case BC_ISF:
    case BC_USETV:
        setbc_d(ins, bc_d(*ins) >= pos ? bc_d(*ins) + 1 : bc_d(*ins));
        break;

    // A
    case BC_ISEQS:
    case BC_ISNES:
    case BC_ISEQN:
    case BC_ISNEN:
    case BC_ISEQP:
    case BC_ISNEP:
    case BC_KSTR:
    case BC_KCDATA:
    case BC_KSHORT:
    case BC_KNUM:
    case BC_KPRI:
    case BC_UGET:
    case BC_UCLO:
    case BC_FNEW:
    case BC_TNEW:
    case BC_TDUP:
    case BC_GGET:
    case BC_GSET:
    case BC_TSETM:
    case BC_CALLM:
    case BC_CALL:
    case BC_CALLMT:
    case BC_CALLT:
    case BC_ITERC:
    case BC_ITERN:
    case BC_VARG:
    case BC_ISNEXT:
    case BC_RETM:
    case BC_RET:
    case BC_RET0:
    case BC_RET1:
    case BC_FORI:
    case BC_JFORI:
    case BC_FORL:
    case BC_IFORL:
    case BC_JFORL:
    case BC_ITERL:
    case BC_IITERL:
    case BC_JITERL:
    case BC_LOOP:
    case BC_ILOOP:
    case BC_JLOOP:
    case BC_JMP:
    case BC_FUNCF:
    case BC_IFUNCF:
    case BC_JFUNCF:
    case BC_FUNCV:
    case BC_IFUNCV:
    case BC_JFUNCV:
    case BC_FUNCC:
    case BC_FUNCCW:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        break;

    default:
        assert(0);
    }
}

/*
 * Parsing
 */

FuncState* my_fs;

int js_ismethod = 0;
int is_statement;

#define my_streq(A, T) (strncmp(A, T, strlen(T)) == 0)

void my_onopennode(const char* type)
{
    FuncState* fs = my_fs;

    // JS_DEBUG("well %s\n", type);

    if (my_streq(type, "parseExpression") && is_statement) {
        JS_DEBUG("--parseExpression (as a statement)\n");
        ExpDesc* stat = js_stack_push();
        (void)stat;
    }

    if (my_streq(type, "parseStatement")) {
        JS_DEBUG("--parseStatement\n");
        is_statement = 1;
        js_ismethod = 0;
    } else {
        is_statement = 0;
    }

    if (my_streq(type, "parseSubscripts")) {
        JS_DEBUG("--parsesubscripts\n");
        // ExpDesc* ident = js_stack_push();
        js_ismethod = 1;
    }

    if (my_streq(type, "call-open")) {
        JS_DEBUG("--call-open\n");
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
        (void)args;
    }

    if (my_streq(type, "parseExprList-next")) {
        JS_DEBUG("--parseExprList-next\n");
        ExpDesc* args = js_stack_top(0);
        js_ismethod = 0;

        // if (args->k == VCALL)  /* f(a, b, g()) or f(a, b, ...). */
        // setbc_b(bcptr(my_fs, args), 0);  /* Pass on multiple results. */

        expr_tonextreg(my_fs, args);
    }

    if (my_streq(type, "typeof")) {
        JS_DEBUG("--typeof\n");

        ExpDesc* ident = js_stack_top(0);
        GCstr* s = lj_str_new(fs->L, type, strlen(type));
        var_lookup_(my_fs, s, ident, 1);
        expr_tonextreg(my_fs, ident);
        ExpDesc* args = js_stack_push();
        (void)args;
    }

#define JS_OP_LEFT(OP, ID)                \
    if (my_streq(type, OP)) {             \
        js_ismethod = 0;                  \
        JS_DEBUG("-- operator " OP "\n"); \
        ExpDesc* e = js_stack_top(0);     \
        bcemit_binop_left(fs, ID, e);     \
        JS_DEBUG("EXPRLEFT %p\n", e);     \
        ExpDesc* e2 = js_stack_push();    \
        (void) e2;                        \
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

    if (my_streq(type, "assign")) {
        JS_DEBUG("--ASSIGNMENT!!!\n");

        // checkcond(ls, VLOCAL <= lh->v.k && lh->v.k <= VINDEXED, LJ_ERR_XSYNTAX);

        // /* Assign RHS to LHS and recurse downwards. */
        // expr_init(&e, VNONRELOC, ls->fs->freereg-1);
        // bcemit_store(ls->fs, &lh->v, &e);

        ExpDesc* rval = js_stack_push();
        (void)rval;
    }

    if (my_streq(type, "if-test")) {
        JS_DEBUG("--if-test\n");

        ExpDesc* test = js_stack_push();
        (void)test;
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

    if (my_streq(type, "var-declarator")) {
        JS_DEBUG("--var-declarator\n");
        js_ismethod = 2;
    }

    if (my_streq(type, "var-declarator-assign")) {
        js_ismethod = 0;
        JS_DEBUG("--var-declarator-assign\n");
        js_stack_push();
    }

    if (my_streq(type, "var-declarator-no-assign")) {
        js_ismethod = 0;
        JS_DEBUG("--var-declarator-no-assign\n");
        ExpDesc* e = js_stack_push();
        expr_init(e, VKNIL, 0);
        expr_tonextreg(my_fs, e);
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

    if (my_streq(type, "ternary-consequent")) {
        js_ismethod = 0;
        JS_DEBUG("--ternary-consequent\n");

        ExpDesc* test = js_stack_top(0);
        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(my_fs, test);

        ExpDesc* consequent = js_stack_push();
        (void)consequent;
    }

    if (my_streq(type, "ternary-alternate")) {
        js_ismethod = 0;
        JS_DEBUG("--ternary-alternate\n");

        ExpDesc* expr = js_stack_top(0);
        expr_tonextreg(my_fs, expr);

        ExpDesc* test = js_stack_top(-1);
        BCPos escapelist = NO_JMP;
        BCPos flist = test->f;
        jmp_append(my_fs, &escapelist, bcemit_jmp(my_fs));
        jmp_tohere(my_fs, test->f);
        test->f = escapelist;

        // ExpDesc* alternate = js_stack_push();
        // (void) alternate;
    }
}

void my_onclosenode(struct Node_C C)
{
    FuncState* fs = my_fs;

    // JS_DEBUG("type %s\n", C.type);
    JS_DEBUG("<- finish %s %s %s %d\n", C.type, C.name, C.raw, C.arguments);

    if (my_streq(C.type, "VariableDeclarator")) {
        ExpDesc* e = js_stack_top(0);
        assign_adjust(fs->ls, 1, 1, e);
        var_add(fs->ls, 1);
    }

    if (my_streq(C.type, "Identifier")) {
        ExpDesc* ident = js_stack_top(0);
        GCstr* s = lj_str_new(fs->L, C.name, strlen(C.name));

        JS_DEBUG("identifier js_ismethod %d\n", js_ismethod);
        if (js_ismethod == 1) {
            ExpDesc key;
            expr_init(&key, VKSTR, 0);
            key.u.sval = s;
            bcemit_method(my_fs, ident, &key);
        } else if (js_ismethod == 0) {
            var_lookup_(my_fs, s, ident, 1);
        } else if (js_ismethod == 2) {
            JS_DEBUG("NEW VARIABLE DECLARED: '%s'\n", C.name);

            JS_DEBUG("actvar %d\n", fs->nactvar);
            var_new(fs->ls, 0, s);

            BCReg reg;
            BCPos pc = fs->pc;
            // fs->freereg++;

            int first = 1;
            for (BCPos i = 0; i < pc; i++) {
                increment_registers(&fs->bcbase[i].ins, fs->nactvar);
                if (bc_op(fs->bcbase[i].ins) == BC_GGET && bc_d(fs->bcbase[i].ins) == const_gc(my_fs, obj2gco(s), LJ_TSTR)) {
                    setbc_op(&fs->bcbase[i].ins, BC_MOV);
                    setbc_d(&fs->bcbase[i].ins, fs->nactvar);
                }
                if (bc_op(fs->bcbase[i].ins) == BC_GSET && bc_d(fs->bcbase[i].ins) == const_gc(my_fs, obj2gco(s), LJ_TSTR)) {
                    setbc_op(&fs->bcbase[i].ins, BC_MOV);
                    setbc_a(&fs->bcbase[i].ins, fs->nactvar);
                    setbc_d(&fs->bcbase[i].ins, bc_a(fs->bcbase[i].ins) + 1);
                }
            }

        } else {
            assert(0);
        }
    }

    if (my_streq(C.type, "AssignmentExpression")) {
        ExpDesc* lval = js_stack_top(-1);
        ExpDesc* rval = js_stack_top(0);

        bcemit_store(my_fs, lval, rval);

        *lval = *rval;
        js_stack_pop();
    }

    if (my_streq(C.type, "ConditionalExpression")) {

        ExpDesc* test = js_stack_top(-1);
        ExpDesc* result = js_stack_top(0);

        fs->freereg--;
        expr_tonextreg(my_fs, result);
        jmp_tohere(my_fs, test->f);
        *test = *result;

        js_stack_pop();
    }

    if (my_streq(C.type, "ExpressionStatement")) {
        js_ismethod = 0;

        ExpDesc* expr = js_stack_top(0);

        if (expr->k == VCALL) { /* Function call statement. */
            // setbc_b(bcptr(my_fs, expr), 1);  /* No results. */
        } else { /* Start of an assignment. */
            // vl.prev = NULL;
            // parse_assignment(ls, &vl, 1);
            JS_DEBUG("TODO: assignment\n");
        }

        expr_tonextreg(my_fs, expr);

        js_stack_pop();

        lua_assert(fs->framesize >= fs->freereg && fs->freereg >= fs->nactvar);
        fs->freereg = fs->nactvar;
    }

    if ((my_streq(C.type, "UnaryExpression") && my_streq(C._operator, "typeof"))) {
        ExpDesc* args = js_stack_top(0);
        expr_tonextreg(my_fs, args);
    }

    if (my_streq(C.type, "CallExpression") || (my_streq(C.type, "UnaryExpression") && my_streq(C._operator, "typeof"))) {
        ExpDesc* ident = js_stack_top(-1);
        ExpDesc* args = js_stack_top(0);

        if (C.arguments == 0) { // f().
            args->k = VVOID;
        } else {
            // if (args->k == VCALL)   f(a, b, g()) or f(a, b, ...).
            //   setbc_b(bcptr(my_fs, args), 0);  /* Pass on multiple results. */
        }

        BCReg base;

        lua_assert(ident->k == VNONRELOC);
        base = ident->u.s.info; /* Base register for call. */
        JS_DEBUG("THIS IS THE BASE %p %d\n", ident, base);
        if (args->k != VVOID)
            expr_tonextreg(my_fs, args);
        BCIns ins = BCINS_ABC(BC_CALL, base, 2, fs->freereg - base);
        expr_init(ident, VCALL, bcemit_INS(my_fs, ins));
        ident->u.s.aux = base;
        fs->bcbase[fs->pc - 1].line = 0;
        fs->freereg = base + 1; /* Leave one result by default. */

        js_stack_pop();
    }

    if (my_streq(C.type, "Literal")) {
        GCstr* s = NULL;
        ExpDesc* args = js_stack_top(0);
        switch (C.value_type) {
        case JS_BOOLEAN:
            expr_init(args, C.value_boolean ? VKTRUE : VKFALSE, 0);
            break;

        case JS_STRING:
            expr_init(args, VKSTR, 0);
            s = lj_str_new(fs->L, C.value_string, strlen(C.value_string));
            args->u.sval = s;
            break;

        case JS_DOUBLE:
            expr_init(args, VKNUM, 0);
            setnumV(&args->u.nval, C.value_double);
            break;

        default:
            // TODO: Workaround for parser
            if (my_streq(C.raw, "true")) {
                expr_init(args, VKTRUE, 0);
            } else if (my_streq(C.raw, "false")) {
                expr_init(args, VKFALSE, 0);
            } else if (my_streq(C.raw, "null")) {
                expr_init(args, VKNIL, 0);
            } else {
                assert(0);
            }
        }
    }

    if (my_streq(C.type, "BinaryExpression")) {
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

    if (my_streq(C.type, "LogicalExpression")) {
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

/*
 * Input
 */

static char* my_input;
static size_t my_input_len = 0;

/* Entry point of bytecode parser. */
GCproto* js_parse(LexState* ls)
{
    FuncState fs;
    FuncScope bl;
    GCproto* pt;

    lua_State* L = ls->L;
#ifdef LUAJIT_DISABLE_DEBUGINFO
    ls->chunkname = lj_str_newlit(L, "=");
#else
    ls->chunkname = lj_str_newz(L, ls->chunkarg);
#endif
    setstrV(L, L->top, ls->chunkname); /* Anchor chunkname string. */

    incr_top(L);

    my_fs = &fs;

    ls->level = 0;

    fs_init(ls, &fs);
    fs.linedefined = 0;
    fs.numparams = 0;
    fs.bcbase = NULL;
    fs.bclim = 0;
    fs.flags |= PROTO_VARARG; /* Main chunk is always a vararg func. */
    fscope_begin(&fs, &bl, 0);
    bcemit_AD(&fs, BC_FUNCV, 0, 0); /* Placeholder. */

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

    L->top--; /* Drop chunkname. */
    lua_assert(fs.prev == NULL);
    lua_assert(ls->fs == NULL);
    lua_assert(pt->sizeuv == 0);
    return pt;
}

static int js_bcdump(lua_State* L, const void* p, size_t sz, void* ud)
{
    fwrite(p, 1, sz, stdout);
    return 0;
}

static TValue* js_cpparser(lua_State* L, lua_CFunction dummy, void* ud)
{
    LexState* ls = (LexState*)ud;
    GCproto* pt;
    GCfunc* fn;
    int bc;
    UNUSED(dummy);
    cframe_errfunc(L->cframe) = -1; /* Inherit error function. */
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

LUA_API int js_loadx(lua_State* L, lua_Reader reader, void* data,
                     const char* chunkname, const char* mode)
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

const char* js_luareader(lua_State* L, void* data, size_t* size)
{
    static size_t len = -1;
    *size = len == -1 ? strlen(my_input) : 0;
    len++;
    return my_input;
}

int main(int argc, char** argv)
{
    if (argc < 1) {
        JS_DEBUG("Usage: test path.js\n");
        return 1;
    }

    // Read in a file.
    FILE* fp;
    fp = fopen(argv[1], "rb");
    if (fp == NULL) {
        JS_DEBUG("no file found\n");
        return 1;
    }
    fseek(fp, 0, SEEK_END); // seek to end of file
    my_input_len = ftell(fp); // get current file pointer
    fseek(fp, 0, SEEK_SET); // seek back to beginning of file
    my_input = (char*)malloc(my_input_len);
    fread(my_input, my_input_len, 1, fp);
    fclose(fp);

    lua_State* L;
    L = luaL_newstate();

    js_loadx(L, js_luareader, NULL, "helloworld", "b");

    // free(my_input);
    return 0;
}
