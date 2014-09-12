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

#define CJC_STACK(T, N)                                                        \
    struct {                                                                   \
        T entries[100];                                                        \
        size_t idx;                                                            \
    } N = { 0 };

#define CJC_STACK_PUSH(T, N)                                                   \
    T* N##_push()                                                              \
    {                                                                          \
        N.idx++;                                                               \
        T* ret = &N.entries[N.idx];                                            \
                                                                               \
        JS_DEBUG("[stack " #N "] push: ");                                     \
        for (int i = 0; i < N.idx; i++) {                                      \
            JS_DEBUG("[] ");                                                   \
        }                                                                      \
        JS_DEBUG("\n");                                                        \
        return ret;                                                            \
    }

#define CJC_STACK_POP(T, N)                                                    \
    void N##_pop()                                                             \
    {                                                                          \
        assert(N.idx >= 1);                                                    \
        N.idx--;                                                               \
                                                                               \
        JS_DEBUG("[stack " #N "] pop: ");                                      \
        for (int i = 0; i < N.idx; i++) {                                      \
            JS_DEBUG("[] ");                                                   \
        }                                                                      \
        JS_DEBUG("\n");                                                        \
    }

#define CJC_STACK_TOP(T, N)                                                    \
    T* N##_top(size_t mod)                                                     \
    {                                                                          \
        T* ret = &N.entries[N.idx + mod];                                      \
        return ret;                                                            \
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
    case BC_TGETB:
    case BC_TSETS:
    case BC_TSETB:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        break;

    case BC_TGETS:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        JS_DEBUG("TGETS--------> %d %d\n", bc_a(*ins), bc_b(*ins));
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
    // case BC_GGET:
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

    case BC_GGET:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        JS_DEBUG("GGET--------> %d %d\n", bc_a(*ins));
        break;

    default:
        assert(0);
    }
}

/*
 * Parsing
 */

LexState* ls;

CJC_STACK(ExpDesc, js_stack);
CJC_STACK_PUSH(ExpDesc, js_stack);
CJC_STACK_POP(ExpDesc, js_stack);
CJC_STACK_TOP(ExpDesc, js_stack);

CJC_STACK(FuncState, js_fs);
CJC_STACK_PUSH(FuncState, js_fs);
CJC_STACK_POP(FuncState, js_fs);
CJC_STACK_TOP(FuncState, js_fs);

static int js_ismethod = 0;
static int is_statement;
static int is_arrayliteral = 0;
static BCReg fnparams = 0;

BCPos start, loop;

#define my_streq(A, T) (strncmp(A, T, strlen(T)) == 0 && strlen(A) == strlen(T))

void my_onopennode(const char* type)
{
    FuncState* fs = js_fs_top(0);

    // JS_DEBUG("well %s\n", type);

    if (my_streq(type, "parseExpression") && is_statement) {
        JS_DEBUG("[>] statement-expression\n");
        ExpDesc* stat = js_stack_push();
        (void)stat;
    }

    if (my_streq(type, "parseStatement")) {
        JS_DEBUG("[>] statement\n");
        is_statement = 1;
        js_ismethod = 0;
    } else {
        is_statement = 0;
    }

    if (my_streq(type, "function")) {
        JS_DEBUG("[>] function %s\n", type);
        JS_DEBUG("---------> LAWDY\n");

        int line = 0;
        int needself = 0;
        FuncState* pfs = fs;
        fs = js_fs_push();
        FuncScope bl;
        ptrdiff_t oldbase = pfs->bcbase - ls->bcstack;
        fs_init(ls, fs);
        JS_DEBUG("OOKKOKOK %p %p %p\n", pfs, fs, fs->L);
        fscope_begin(fs, &bl, 0);
        fs->linedefined = line;
        //(uint8_t)parse_params(ls, needself);
        fs->bcbase = pfs->bcbase + pfs->pc;
        fs->bclim = pfs->bclim - pfs->pc;
        bcemit_AD(fs, BC_FUNCF, 0, 0); /* Placeholder. */
        // parse_chunk(ls);

        fs->numparams = 0;

        // Implicit "this".
        var_new(ls, fs->numparams++, lj_str_new(fs->L, "this", strlen("this")));

        // FuncState *fs;
        // ExpDesc v, b;
        // int needself = 0;
        // /* Parse function name. */
        // var_lookup(ls, &v);
        // while (ls->token == '.')  /* Multiple dot-separated fields. */
        // expr_field(ls, &v);
        // if (ls->token == ':') {  /* Optional colon to signify method call. */
        // needself = 1;
        // expr_field(ls, &v);
        // }
        // parse_body(ls, &b, needself, line);
        // fs = ls->fs;
        // bcemit_store(fs, &v, &b);
        // fs->bcbase[fs->pc - 1].line = line;  /* Set line for the store. */
    }

    if (my_streq(type, "function-param")) {
        JS_DEBUG("[>] function-param\n");
        js_ismethod = 3;
    }

    if (my_streq(type, "function-body")) {
        js_ismethod = 0;
        JS_DEBUG("[>] function-body\n");
        var_add(ls, fs->numparams);
        lua_assert(fs->nactvar == fs->numparams);
        bcreg_reserve(fs, fs->numparams);
    }

    if (my_streq(type, "parseSubscripts")) {
        JS_DEBUG("[>] subscripts\n");
        // ExpDesc* ident = js_stack_push();
        js_ismethod = 1;
    }

    if (my_streq(type, "member-var-open")) {
        JS_DEBUG("[>] member-var-open\n");
        js_ismethod = 0;

        js_stack_push();
    }

    if (my_streq(type, "member-var-close")) {
        JS_DEBUG("[>] member-var-close\n");

        ExpDesc* base = js_stack_top(-1);
        ExpDesc* key = js_stack_top(0);

        expr_toanyreg(fs, base);
        expr_index(fs, base, key);
        js_stack_pop();
    }

    if (my_streq(type, "call-open")) {
        JS_DEBUG("[>] call-open\n");
        ExpDesc* ident = js_stack_top(0);

        if (ident->k == VINDEXED) {
            // rewrite
            bcreg_reserve(fs, 1);
            expr_tonextreg(fs, ident);
            bcemit_AD(fs, BC_MOV, fs->freereg, fs->freereg - 2);
            bcreg_reserve(fs, 1);
            // bcemit_method(fs, ident, &key);
        }

        if (ident->k == VGLOBAL || ident->k == VLOCAL) {
            expr_tonextreg(fs, ident);

            // expr_init(&global, VGLOBAL, 0);
            // global.u.sval = lj_str_new(fs->L, "_G", strlen("_G"));
            // expr_tonextreg(fs, &global);

            ExpDesc str;
            expr_init(&str, VKSTR, 0);
            str.u.sval = lj_str_new(fs->L, "global", strlen("global"));

            ExpDesc global;
            expr_init(&global, VINDEXED, 0);
            global.u.s.aux = ~(const_str(fs, &str));
            expr_tonextreg(fs, &global);
        }
        js_ismethod = 0;

        // if (!js_ismethod) {
        //   expr_tonextreg(fs, ident);
        // }
        // js_ismethod = 0;
        ExpDesc* args = js_stack_push();
        // JS_DEBUG("---------> ident %p has a base of %d\n", ident,
        // ident->u.s.aux);
        (void)args;
    }

    if (my_streq(type, "parseExprList-next") && is_arrayliteral == 0) {
        JS_DEBUG("[>] call-nextarg\n");
        ExpDesc* args = js_stack_top(0);
        js_ismethod = 0;

        // if (args->k == VCALL)  /* f(a, b, g()) or f(a, b, ...). */
        // setbc_b(bcptr(fs, args), 0);  /* Pass on multiple results. */

        expr_tonextreg(fs, args);
    }

    if (my_streq(type, "typeof")) {
        JS_DEBUG("[>] typeof\n");

        ExpDesc* ident = js_stack_top(0);

        ExpDesc str;
        expr_init(&str, VKSTR, 0);
        str.u.sval = lj_str_new(fs->L, type, strlen(type));

        ident->k = VINDEXED;
        ident->u.s.info = 0;
        ident->u.s.aux = ~(const_str(fs, &str));
        expr_tonextreg(fs, ident);

        ExpDesc* args = js_stack_push();
        (void)args;
    }

#define JS_OP_LEFT(OP, ID)                                                     \
    if (my_streq(type, OP)) {                                                  \
        js_ismethod = 0;                                                       \
        JS_DEBUG("[>] operator " OP "\n");                                     \
        ExpDesc* e = js_stack_top(0);                                          \
        bcemit_binop_left(fs, ID, e);                                          \
        ExpDesc* e2 = js_stack_push();                                         \
        (void) e2;                                                             \
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
        js_ismethod = 0;

        JS_DEBUG("[>] assign\n");

        // checkcond(ls, VLOCAL <= lh->v.k && lh->v.k <= VINDEXED,
        // LJ_ERR_XSYNTAX);

        // /* Assign RHS to LHS and recurse downwards. */
        // expr_init(&e, VNONRELOC, ls->fs->freereg-1);
        // bcemit_store(ls->fs, &lh->v, &e);

        ExpDesc* rval = js_stack_push();
        (void)rval;
    }

    if (my_streq(type, "while-test") || my_streq(type, "for-test")) {
        JS_DEBUG("[>] while-test\n");
        js_ismethod = 0;

        ExpDesc* test = js_stack_push();
        (void)test;

        // lj_lex_next(ls);  /* Skip 'while'. */
        start = fs->lasttarget = fs->pc;
        // condexit = expr_cond(ls);
        // // fscope_begin(fs, &bl, FSCOPE_LOOP);
        // // lex_check(ls, TK_do);
        // loop = bcemit_AD(fs, BC_LOOP, fs->nactvar, 0);
        // parse_block(ls);
    }

    if (my_streq(type, "for-update")) {
        JS_DEBUG("[>] for-update\n");
        js_ismethod = 0;

        ExpDesc* test = js_stack_top(0);
        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(fs, test);

        loop = bcemit_AD(fs, BC_LOOP, fs->nactvar, 0);

        // ExpDesc* consequent = js_stack_push();
        // (void) consequent;

        ExpDesc* dummy = js_stack_push();
        dummy->t = bcemit_AJ(fs, BC_JMP, fs->freereg, NO_JMP);
        dummy->f = fs->pc;

        js_ismethod = 0;
        js_stack_push();
    }

    if (my_streq(type, "for-body")) {
        JS_DEBUG("[>] for-body\n");

        BCPos reloop = bcemit_AJ(fs, BC_JMP, fs->freereg, NO_JMP);
        jmp_patchins(fs, reloop, start);

        ExpDesc* test = js_stack_top(-2);

        ExpDesc* update = js_stack_top(0);
        expr_tonextreg(fs, update);

        ExpDesc* dummy = js_stack_top(-1);
        jmp_patchins(fs, dummy->t, fs->pc);
        start = dummy->f;

        js_stack_pop();
        js_stack_pop();
    }

    if (my_streq(type, "while-body")) {
        JS_DEBUG("[>] while-body\n");

        ExpDesc* test = js_stack_top(0);
        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(fs, test);

        loop = bcemit_AD(fs, BC_LOOP, fs->nactvar, 0);

        // ExpDesc* consequent = js_stack_push();
        // (void) consequent;
    }

    if (my_streq(type, "while-end") || my_streq(type, "for-end")) {
        JS_DEBUG("[>] while-end\n");

        ExpDesc* test = js_stack_top(0);
        // jmp_tohere(fs, test->f);

        jmp_patch(fs, bcemit_jmp(fs), start);
        // lex_match(ls, TK_end, TK_while, line);
        // fscope_end(fs);
        jmp_tohere(fs, test->f);
        jmp_patchins(fs, loop, fs->pc);

        js_stack_pop();
    }

    if (my_streq(type, "if-test")) {
        JS_DEBUG("[>] if-test\n");

        ExpDesc* test = js_stack_push();
        (void)test;
    }

    if (my_streq(type, "if-consequent")) {
        JS_DEBUG("[>] if-consequent\n");

        ExpDesc* test = js_stack_top(0);
        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(fs, test);

        // ExpDesc* consequent = js_stack_push();
        // (void) consequent;
    }

    if (my_streq(type, "if-alternate")) {
        JS_DEBUG("[>] if-alternate\n");

        ExpDesc* test = js_stack_top(0);
        BCPos escapelist = NO_JMP;
        BCPos flist = test->f;
        jmp_append(fs, &escapelist, bcemit_jmp(fs));
        jmp_tohere(fs, test->f);
        test->f = escapelist;

        // ExpDesc* alternate = js_stack_push();
        // (void) alternate;
    }

    if (my_streq(type, "var-declarator")) {
        JS_DEBUG("[>] var-declarator\n");
        js_ismethod = 2;
        js_stack_push();
    }

    if (my_streq(type, "var-declarator-assign")) {
        js_ismethod = 0;
        JS_DEBUG("[>] var-declarator-assign\n");
        js_stack_push();
    }

    if (my_streq(type, "var-declarator-no-assign")) {
        js_ismethod = 0;
        JS_DEBUG("[>] var-declarator-no-assign\n");
        ExpDesc* e = js_stack_push();
        *e = *js_stack_top(-1);
        // expr_init(e, VKNIL, 0);
        // expr_tonextreg(fs, e);
    }

    if (my_streq(type, "if-no-alternate")) {
        JS_DEBUG("[>] if-no-alternate\n");

        ExpDesc* test = js_stack_top(0);
        BCPos escapelist = NO_JMP;
        jmp_append(fs, &escapelist, test->f);
        test->f = escapelist;
    }

    if (my_streq(type, "if-end")) {
        JS_DEBUG("[>] if-end\n");

        ExpDesc* test = js_stack_top(0);
        jmp_tohere(fs, test->f);

        js_stack_pop();
    }

    if (my_streq(type, "ternary-consequent")) {
        js_ismethod = 0;
        JS_DEBUG("[>] ternary-consequent\n");

        ExpDesc* test = js_stack_top(0);
        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(fs, test);

        ExpDesc* consequent = js_stack_push();
        (void)consequent;
    }

    if (my_streq(type, "ternary-alternate")) {
        js_ismethod = 0;
        JS_DEBUG("[>] ternary-alternate\n");

        ExpDesc* expr = js_stack_top(0);
        expr_tonextreg(fs, expr);

        ExpDesc* test = js_stack_top(-1);
        BCPos escapelist = NO_JMP;
        BCPos flist = test->f;
        jmp_append(fs, &escapelist, bcemit_jmp(fs));
        jmp_tohere(fs, test->f);
        test->f = escapelist;

        // ExpDesc* alternate = js_stack_push();
        // (void) alternate;
    }

    if (my_streq(type, "return-no-argument")) {
        JS_DEBUG("[>] return-no-argument\n");
        bcemit_INS(fs, BCINS_AD(BC_RET0, 0, 1));
    }

    if (my_streq(type, "return-argument")) {
        JS_DEBUG("[>] return-no-argument\n");

        ExpDesc* expr = js_stack_top(0);
        bcemit_INS(fs, BCINS_AD(BC_RET1, expr_toanyreg(fs, expr), 2));
    }

    if (my_streq(type, "array-literal-open")) {
        JS_DEBUG("[>] array-literal-open\n");

        ExpDesc* e = js_stack_top(0);

        FuncState* fs = ls->fs;
        BCLine line = ls->linenumber;
        GCtab* t = NULL;
        int vcall = 0, needarr = 0, fixt = 0;
        uint32_t narr = 0; /* First array index. */
        uint32_t nhash = 0; /* Number of hash entries. */
        BCReg freg = fs->freereg;
        BCPos pc = bcemit_AD(fs, BC_TNEW, freg, 0);
        expr_init(e, VNONRELOC, freg);
        bcreg_reserve(fs, 1);
        freg++;

        // e->u.s.aux = pc;

        ExpDesc* key = js_stack_push();
        expr_init(key, VKNUM, 0);
        setintV(&key->u.nval, (int)0);

        is_arrayliteral = 1;

        js_stack_push(); // value
    }
    if (my_streq(type, "parseExprList-next") && is_arrayliteral > 0) {
        JS_DEBUG("[>] array-literal-next\n");
        ExpDesc* obj = js_stack_top(-2);
        ExpDesc* key = js_stack_top(-1);
        ExpDesc* val = js_stack_top(0);

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        expr_init(key, VKNUM, 0);
        setintV(&key->u.nval, is_arrayliteral++);
    }
    if (my_streq(type, "array-literal-close")) {
        JS_DEBUG("[>] array-literal-close\n");
        ExpDesc* obj = js_stack_top(-2);
        ExpDesc* key = js_stack_top(-1);
        ExpDesc* val = js_stack_top(0);

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        // js_ismethod = 4;
        js_stack_pop();
        js_stack_pop();
        is_arrayliteral = 0;
    }

    if (my_streq(type, "object-literal")) {
        JS_DEBUG("[>] object-literal\n");

        ExpDesc* e = js_stack_top(0);

        FuncState* fs = ls->fs;
        BCLine line = ls->linenumber;
        GCtab* t = NULL;
        int vcall = 0, needarr = 0, fixt = 0;
        uint32_t narr = 0; /* First array index. */
        uint32_t nhash = 0; /* Number of hash entries. */
        BCReg freg = fs->freereg;
        BCPos pc = bcemit_AD(fs, BC_TNEW, freg, 0);
        expr_init(e, VNONRELOC, freg);
        bcreg_reserve(fs, 1);
        freg++;

        e->u.s.aux = pc;
        JS_DEBUG("EUSAUX PC %p %d\n", e, pc);
    }

    if (my_streq(type, "object-literal-key")) {
        JS_DEBUG("[>] object-literal-key\n");

        js_ismethod = 4;
        js_stack_push();
    }

    if (my_streq(type, "object-literal-value")) {
        JS_DEBUG("[>] object-literal-value\n");
        js_stack_push();
    }

    if (my_streq(type, "object-literal-push")) {
        JS_DEBUG("[>] object-literal-push\n");
        ExpDesc* obj = js_stack_top(-2);
        ExpDesc* key = js_stack_top(-1);
        ExpDesc* val = js_stack_top(0);

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        // JS_DEBUG("EUSAUX PC %p %d\n", obj, obj->u.s.aux);
        // BCIns *ip = &fs->bcbase[obj->u.s.aux].ins;
        // if (!needarr) narr = 0;
        // else if (narr < 3) narr = 3;
        // else if (narr > 0x7ff) narr = 0x7ff;
        // int nhash = 2;
        // setbc_d(ip, 0|(hsize2hbits(nhash)<<11));

        js_stack_pop();
        js_stack_pop();
    }
}

void my_onclosenode(struct Node_C C)
{
    FuncState* fs = js_fs_top(0);

    JS_DEBUG("[<] %s\n", C.type);
    // JS_DEBUG("<- finish %s %s %s %d\n", C.type, C.name, C.raw, C.arguments);

    // Workaround for typeof to act like a function.
    if ((my_streq(C.type, "UnaryExpression")
         && my_streq(C._operator, "typeof"))) {
        ExpDesc* args = js_stack_top(0);
        expr_tonextreg(fs, args);
    }

    // Switch statement.
    if (my_streq(C.type, "VariableDeclarator")) {
        ExpDesc* ident = js_stack_top(-1);
        ExpDesc* val = js_stack_top(0);

        if (ident->u.s.aux == -1) {
            expr_discharge(fs, val);
            expr_free(fs, val);
            bcreg_reserve(fs, 1);
            expr_toreg_nobranch(fs, val, fs->freereg - 1);

            assign_adjust(fs->ls, 1, 1, val);
            var_add(fs->ls, 1);
        } else {
            bcemit_store(fs, ident, val);
        }

        js_stack_pop();
        js_stack_pop();
    } else if (my_streq(C.type, "FunctionExpression")) {
        // if (ls->token != TK_end) lex_match(ls, TK_end, TK_function, line);
        ptrdiff_t oldbase = 0;

        int line = 0;
        FuncState* pfs = js_fs_top(-1);
        GCproto* pt = fs_finish(ls, (ls->lastline = ls->linenumber));
        pfs->bcbase = ls->bcstack + oldbase; /* May have been reallocated. */
        pfs->bclim = (BCPos)(ls->sizebcstack - oldbase);
        /* Store new prototype in the constant array of the parent. */
        expr_init(
            js_stack_top(0), VRELOCABLE,
            bcemit_AD(pfs, BC_FNEW, 0, const_gc(pfs, obj2gco(pt), LJ_TPROTO)));
#if LJ_HASFFI
        pfs->flags |= (fs->flags & PROTO_FFI);
#endif
        if (!(pfs->flags & PROTO_CHILD)) {
            if (pfs->flags & PROTO_HAS_RETURN) {
                pfs->flags |= PROTO_FIXUP_RETURN;
            }
            pfs->flags |= PROTO_CHILD;
        }
        js_fs_pop();
        fs = js_fs_top(0);

        // js_stack_pop();
    } else if (my_streq(C.type, "Identifier")) {
        ExpDesc* ident = js_stack_top(0);
        JS_DEBUG("fs %p, %p\n", fs, fs->L);
        assert(fs->L);
        GCstr* s = lj_str_new(fs->L, C.name, strlen(C.name));

        JS_DEBUG("[ident] js_ismethod %d\n", js_ismethod);
        if (js_ismethod == 0) {
            var_lookup_(fs, s, ident, 1);
        } else if (js_ismethod == 1) {
            ExpDesc key;
            expr_init(&key, VKSTR, 0);
            key.u.sval = s;

            expr_toanyreg(fs, ident);
            expr_index(fs, ident, &key);
        } else if (js_ismethod == 2) {
            JS_DEBUG("NEW VARIABLE DECLARED: '%s' %d\n", C.name,
                     var_lookup_local(fs, s));

            // JS_DEBUG("actvar %d\n", fs->nactvar);
            if (var_lookup_local(fs, s) == -1) {
                ident->k = VLOCAL;
                ident->u.s.aux = -1;

                var_new(fs->ls, 0, s);

                BCReg reg;
                BCPos pc = fs->pc;
                // fs->freereg++;

                int first = 1;
                for (BCPos i = 0; i < pc; i++) {
                    increment_registers(&fs->bcbase[i].ins, fs->nactvar);
                    if (bc_op(fs->bcbase[i].ins) == BC_GGET
                        && bc_d(fs->bcbase[i].ins)
                           == const_gc(fs, obj2gco(s), LJ_TSTR)) {
                        setbc_op(&fs->bcbase[i].ins, BC_MOV);
                        setbc_d(&fs->bcbase[i].ins, fs->nactvar);
                    }
                    if (bc_op(fs->bcbase[i].ins) == BC_GSET
                        && bc_d(fs->bcbase[i].ins)
                           == const_gc(fs, obj2gco(s), LJ_TSTR)) {
                        setbc_op(&fs->bcbase[i].ins, BC_MOV);
                        setbc_a(&fs->bcbase[i].ins, fs->nactvar);
                        setbc_d(&fs->bcbase[i].ins,
                                bc_a(fs->bcbase[i].ins) + 1);
                    }
                }
            } else {
                var_lookup_(fs, s, ident, 1);

                JS_DEBUG("FOUND %d\n", ident->u.s.aux);
            }

        } else if (js_ismethod == 3) {
            var_new(ls, fs->numparams++, s);

        } else if (js_ismethod == 4) {
            expr_init(ident, VKSTR, 0);
            ident->u.sval = s;
        } else {
            assert(0);
        }
    } else if (my_streq(C.type, "AssignmentExpression")) {
        ExpDesc* lval = js_stack_top(-1);
        ExpDesc* rval = js_stack_top(0);

        bcemit_store(fs, lval, rval);

        *lval = *rval;
        js_stack_pop();
    } else if (my_streq(C.type, "ConditionalExpression")) {

        ExpDesc* test = js_stack_top(-1);
        ExpDesc* result = js_stack_top(0);

        fs->freereg--;
        expr_tonextreg(fs, result);
        jmp_tohere(fs, test->f);
        *test = *result;

        js_stack_pop();
    } else if (my_streq(C.type, "ExpressionStatement")) {
        js_ismethod = 0;

        ExpDesc* expr = js_stack_top(0);

        if (expr->k == VCALL) { /* Function call statement. */
            setbc_b(bcptr(fs, expr), 1); /* No results. */
        } else { /* Start of an assignment. */
            // vl.prev = NULL;
            // parse_assignment(ls, &vl, 1);
            JS_DEBUG("TODO: assignment\n");
        }

        // expr_tonextreg(fs, expr);

        js_stack_pop();

        lua_assert(fs->framesize >= fs->freereg && fs->freereg >= fs->nactvar);
        fs->freereg = fs->nactvar;
    } else if (my_streq(C.type, "CallExpression")
               || (my_streq(C.type, "UnaryExpression")
                   && my_streq(C._operator, "typeof"))) {
        ExpDesc* ident = js_stack_top(-1);
        ExpDesc* args = js_stack_top(0);

        if (C.arguments == 0) { // f().
            args->k = VVOID;
        } else {
            // if (args->k == VCALL)   f(a, b, g()) or f(a, b, ...).
            //   setbc_b(bcptr(fs, args), 0);  /* Pass on multiple results. */
        }

        BCReg base;

        lua_assert(ident->k == VNONRELOC);
        base = ident->u.s.info; /* Base register for call. */
        // JS_DEBUG("THIS IS THE BASE %p %d\n", ident, base);
        if (args->k != VVOID)
            expr_tonextreg(fs, args);
        BCIns ins = BCINS_ABC(BC_CALL, base, 2, fs->freereg - base);
        expr_init(ident, VCALL, bcemit_INS(fs, ins));
        ident->u.s.aux = base;
        fs->bcbase[fs->pc - 1].line = 0;
        fs->freereg = base + 1; /* Leave one result by default. */

        js_stack_pop();
    } else if (my_streq(C.type, "Literal")) {
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
    } else if (my_streq(C.type, "BinaryExpression")) {
        JS_DEBUG("[binaryexpr] %s\n", C._operator);

        ExpDesc* e1 = js_stack_top(-1);
        ExpDesc* e2 = js_stack_top(0);

        if (my_streq(C._operator, "==")) {
            bcemit_binop(fs, OPR_EQ, e1, e2);
        } else if (my_streq(C._operator, "!=")) {
            bcemit_binop(fs, OPR_NE, e1, e2);
        } else if (my_streq(C._operator, "<")) {
            bcemit_binop(fs, OPR_LT, e1, e2);
        } else if (my_streq(C._operator, ">=")) {
            bcemit_binop(fs, OPR_GE, e1, e2);
        } else if (my_streq(C._operator, "<=")) {
            bcemit_binop(fs, OPR_LE, e1, e2);
        } else if (my_streq(C._operator, ">")) {
            bcemit_binop(fs, OPR_GT, e1, e2);
        } else if (my_streq(C._operator, "+")) {
            bcemit_binop(fs, OPR_ADD, e1, e2);
        } else if (my_streq(C._operator, "-")) {
            bcemit_binop(fs, OPR_SUB, e1, e2);
        } else if (my_streq(C._operator, "*")) {
            bcemit_binop(fs, OPR_MUL, e1, e2);
        } else if (my_streq(C._operator, "/")) {
            bcemit_binop(fs, OPR_DIV, e1, e2);
        } else if (my_streq(C._operator, "%")) {
            bcemit_binop(fs, OPR_MOD, e1, e2);
        } else {
            assert(0);
        }

        js_stack_pop(); // pop e2
    } else if (my_streq(C.type, "LogicalExpression")) {
        JS_DEBUG("[logicalexpr] %s\n", C._operator);

        ExpDesc* e1 = js_stack_top(-1);
        ExpDesc* e2 = js_stack_top(0);

        if (my_streq(C._operator, "&&")) {
            bcemit_binop(fs, OPR_AND, e1, e2);
        } else if (my_streq(C._operator, "||")) {
            bcemit_binop(fs, OPR_OR, e1, e2);
        } else {
            assert(0);
        }

        // JS_DEBUG("EXPR %p t: %d f: %d\n", e1, e1->t, e1->f);
        // JS_DEBUG("EXPR2 %p t: %d f: %d\n", e2, e2->t, e2->f);

        js_stack_pop(); // pop e2
    } else if (my_streq(C.type, "Program")) {
        js_fs_pop();
    } else if (my_streq(C.type, "Property")) {
    } else if (my_streq(C.type, "ThisExpression")) {
        ExpDesc* expr = js_stack_top(0);
        GCstr* s = lj_str_new(fs->L, "this", strlen("this"));
        var_lookup_(fs, s, expr, 1);
    } else if (my_streq(C.type, "ArrayExpression")) {
    } else if (my_streq(C.type, "ObjectExpression")) {
        ExpDesc* e = js_stack_top(0);

        // lex_check(ls, '{');
        // snip...!
        // lex_match(ls, '}', '{', line);
        // if (pc == fs->pc-1) {  /* Make expr relocable if possible. */
        e->u.s.info = fs->pc - 1;
        fs->freereg--;
        e->k = VRELOCABLE;
        // } else {
        // e->k = VNONRELOC;  /* May have been changed by expr_index. */
        // }
        // if (!t) {   Construct TNEW RD: hhhhhaaaaaaaaaaa.
        // BCIns *ip = &fs->bcbase[pc].ins;
        // if (!needarr) narr = 0;
        // else if (narr < 3) narr = 3;
        // else if (narr > 0x7ff) narr = 0x7ff;
        // setbc_d(ip, narr|(hsize2hbits(nhash)<<11));
        // } else {
        //   if (needarr && t->asize < narr)
        //     lj_tab_reasize(fs->L, t, narr-1);
        //   if (fixt) {  /* Fix value for dummy keys in template table. */
        //     Node *node = noderef(t->node);
        //     uint32_t i, hmask = t->hmask;
        //     for (i = 0; i <= hmask; i++) {
        //   Node *n = &node[i];
        //   if (tvistab(&n->val)) {
        //     lua_assert(tabV(&n->val) == t);
        //     setnilV(&n->val);  /* Turn value into nil. */
        //   }
        //     }
        //   }
        //   lj_gc_check(fs->L);
        // }

    } else if (my_streq(C.type, "UpdateExpression")) {
        ExpDesc* expr = js_stack_top(0);
        // expr_tonextreg(fs, expr);

        if (expr->k == VINDEXED) {
            // Create key register to take register of base.
            ExpDesc key = *expr;

            // TODO: overwrite previous expr to save a MOV.
            bcemit_AD(fs, BC_MOV, fs->freereg, fs->freereg - 1);
            expr->u.s.info += 1;

            // Create increment value.
            ExpDesc incr;
            expr_init(&incr, VKNUM, 0);
            setnumV(&incr.u.nval, my_streq(C._operator, "--") ? -1 : 1);

            // Dispatch key to register.
            expr_tonextreg(fs, &key);

            // Add increment to key. If not prefixed, do this in separate
            // register.
            if (!C.prefix) {
                fs->freereg += 2;
                key.u.s.info += 2;
                bcemit_AD(fs, BC_MOV, fs->freereg - 1, fs->freereg - 3);
            }
            bcemit_binop(fs, OPR_ADD, &key, &incr);

            // Store and save return value.
            bcemit_store(fs, expr, &key);
            expr->k = VRELOCABLE;
            expr->u.s.info = fs->pc;

            // Free registers.
            expr_free(fs, &key);
            if (!C.prefix) {
                fs->freereg -= 2;
            }
        } else {
            // If prefixed, do these in a separate register.
            if (!C.prefix) {
                fs->freereg += 1;
            }

            // Create key register to take register of base.
            ExpDesc key = *expr;
            if (!C.prefix) {
                expr_tonextreg(fs, &key);
            }

            // TODO: overwrite previous expr to save a MOV.
            if (!C.prefix) {
                bcemit_AD(fs, BC_MOV, fs->freereg - 2, fs->freereg - 1);
            }

            // Create increment value.
            ExpDesc incr;
            expr_init(&incr, VKNUM, 0);
            setnumV(&incr.u.nval, my_streq(C._operator, "--") ? -1 : 1);

            // Add increment to key.
            bcemit_binop(fs, OPR_ADD, &key, &incr);
            if (expr->k == VLOCAL) {
                // Save in original location.
                expr_toreg(fs, &key, key.u.s.aux);
            }

            // Store and save return value.
            if (!C.prefix || expr->k == VGLOBAL) {
                bcemit_store(fs, expr, &key);
                expr->k = VRELOCABLE;
                expr->u.s.info = fs->pc;

                // Free registers.
                expr_free(fs, &key);
            }

            if (!C.prefix) {
                fs->freereg -= 1;
            }
        }
    } else if (my_streq(C.type, "ReturnStatement")
               || my_streq(C.type, "MemberExpression")
               || my_streq(C.type, "VariableDeclaration")
               || my_streq(C.type, "UpdateExpression")
               || my_streq(C.type, "BlockStatement")
               || my_streq(C.type, "IfStatement")
               || my_streq(C.type, "WhileStatement")
               || my_streq(C.type, "ForStatement") || 0) {
        // noop
    } else {
        assert(0);
    }

    // js_ismethod = 0;
}

/*
 * Input
 */

static char* my_input;
static size_t my_input_len = 0;

/* Entry point of bytecode parser. */
GCproto* js_parse(LexState* ls)
{
    FuncState* fs = js_fs_push();
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

    ls->level = 0;

    fs_init(ls, fs);
    fs->linedefined = 0;
    fs->numparams = 0;
    fs->bcbase = NULL;
    fs->bclim = 0;
    fs->flags |= PROTO_VARARG; /* Main chunk is always a vararg func. */
    fscope_begin(fs, &bl, 0);
    bcemit_AD(fs, BC_FUNCV, 0, 0); /* Placeholder. */

    // EXPECTED: Remove this bit, add our code.
    /*
lj_lex_next(ls);
parse_chunk(ls);
if (ls->token != TK_eof)
  err_token(ls, TK_eof);
*/
    synlevel_begin(ls);

    // Reserve first register as argument.
    fs->numparams += 1;
    bcreg_reserve(fs, 1);
    var_new(ls, 0, lj_str_new(fs->L, "", 0));
    fs->nactvar += 1;

    // // Register "this" variable
    // ExpDesc str;
    // expr_init(&str, VKSTR, 0);
    // str.u.sval = lj_str_new(fs->L, "global", strlen("global"));
    // ExpDesc global;
    // expr_init(&global, VINDEXED, 0);
    // global.u.s.aux = ~(const_str(fs, &str));
    // expr_tonextreg(fs, &global);
    // bcreg_reserve(fs, 1);
    // var_new_lit(ls, 0, "this");
    // var_add(ls, 1);
    // fs->nactvar += 1;

    jsparse(my_input, strlen(my_input), my_onopennode, my_onclosenode);
    synlevel_end(ls);

    pt = fs_finish(ls, ls->linenumber);

    L->top--; /* Drop chunkname. */
    lua_assert(fs->prev == NULL);
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
    ls = (LexState*)ud;
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
    // js_fs_pop();

    JS_DEBUG("%d %d\n", js_fs.idx, js_stack.idx);
    assert(js_fs.idx == 0);
    assert(js_stack.idx == 0);

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
