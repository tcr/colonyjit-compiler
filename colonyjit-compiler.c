#include <stdio.h>
#include <fcntl.h>
#include <stdio.h>
#include <assert.h>

#include <lj_frame.h>
#include <lj_bcdump.h>
#include <lua.h>
#include <lauxlib.h>

#include "parser/out/jsparser.h"

#include "stack.h"
#define _stacktype_ExpDesc
#define _stacktype_BCPos

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

#define CJC(T, N) CJC_STACK(T, N); \
    CJC_STACK_PUSH(T, N); \
    CJC_STACK_POP(T, N); \
    CJC_STACK_TOP(T, N);

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
        break;

    // A and B and D
    case BC_ADDVV:
    case BC_SUBVV:
    case BC_MULVV:
    case BC_DIVVV:
    case BC_MODVV:
    case BC_POW:
    case BC_CAT:
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        setbc_c(ins, bc_c(*ins) >= pos ? bc_c(*ins) + 1 : bc_c(*ins));
        break;

    case BC_TGETV:
    case BC_TSETV:
        // TODO C or D?
        setbc_a(ins, bc_a(*ins) >= pos ? bc_a(*ins) + 1 : bc_a(*ins));
        setbc_b(ins, bc_b(*ins) >= pos ? bc_b(*ins) + 1 : bc_b(*ins));
        setbc_c(ins, bc_c(*ins) >= pos ? bc_c(*ins) + 1 : bc_c(*ins));
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
        break;

    default:
        assert(0);
    }
}

static int streq(const char* A, const char* T) {
    return strncmp(A, T, strlen(T)) == 0 && strlen(A) == strlen(T);
}

static GCstr* create_str (FuncState* fs, const char *label) {
    return lj_str_new(fs->L, label, strlen(label));
}

static void internal_ref (FuncState* fs, ExpDesc* ident, const char *label)
{
    ExpDesc str;
    expr_init(&str, VKSTR, 0);
    str.u.sval = create_str(fs, label);

    var_lookup_(fs, create_str(fs, ""), ident, 1);
    expr_tonextreg(fs, ident);
    expr_index(fs, ident, &str);
    expr_tonextreg(fs, ident);
}

/*
 * Parsing
 */

LexState* ls;

CJC(FuncState, js_fs);

static int js_ismethod = 0;
static int is_statement;
static int is_arrayliteral = 0;
static BCReg fnparams = 0;

#define OPENNODE(T) if (streq(type, #T))

void handle_node (FuncState* fs, const char* type, struct Node_C C)
{
    OPENNODE(expression-statement) {
        PUSH(ExpDesc* expr);
    }

    OPENNODE(function) {
        int line = 0;
        int needself = 0;
        FuncState* pfs = fs;
        fs = js_fs_push();
        FuncScope bl;
        ptrdiff_t oldbase = pfs->bcbase - ls->bcstack;
        fs_init(ls, fs);
        // JS_DEBUG("OOKKOKOK %p %p %p\n", pfs, fs, fs->L);
        fscope_begin(fs, &bl, 0);
        fs->linedefined = line;
        //(uint8_t)parse_params(ls, needself);
        fs->bcbase = pfs->bcbase + pfs->pc;
        fs->bclim = pfs->bclim - pfs->pc;
        bcemit_AD(fs, BC_FUNCF, 0, 0); /* Placeholder. */
        // parse_chunk(ls);

        fs->numparams = 0;

        // Implicit "this".
        var_new(ls, fs->numparams++, create_str(fs, "this"));

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

    OPENNODE(function-param) {
        js_ismethod = 3;
    }

    OPENNODE(function-body) {
        js_ismethod = 0;

        var_add(ls, fs->numparams);
        lua_assert(fs->nactvar == fs->numparams);
        bcreg_reserve(fs, fs->numparams);
    }

    OPENNODE(subscripts) {
        js_ismethod = 1;
    }

    OPENNODE(member-var-open) {
        js_ismethod = 0;

        PUSH(ExpDesc* ident);
    }

    OPENNODE(member-var-close) {
        READ(ExpDesc* base, ExpDesc* key);

        expr_toanyreg(fs, base);
        expr_index(fs, base, key);

        POP(key);
    }

    OPENNODE(new-open) {
        READ(ExpDesc* ident);

        internal_ref(fs, ident, "new");

        PUSH(ExpDesc* args);
    }

    if (streq(type, "call-open")) {
        READ(ExpDesc* ident);
        js_ismethod = 0;

        if (ident->k == VINDEXED) {
            // rewrite
            // bcreg_reserve(fs, 1);
            uint32_t source = ident->u.s.info;
            expr_tonextreg(fs, ident);
            bcemit_AD(fs, BC_MOV, fs->freereg, source);
            bcreg_reserve(fs, 1);
            // bcemit_method(fs, ident, &key);
        }

        else {
            expr_tonextreg(fs, ident);

            ExpDesc global;
            internal_ref(fs, &global, "global");
            expr_tonextreg(fs, &global);
        }

        PUSH(ExpDesc* args);
    }

    if (streq(type, "new-args")) {
        READ(ExpDesc* ident);
        js_ismethod = 0;

        if (ident->k == VINDEXED) {
            // rewrite
            // bcreg_reserve(fs, 1);
            uint32_t source = ident->u.s.info;
            expr_tonextreg(fs, ident);
            bcemit_AD(fs, BC_MOV, fs->freereg, source);
            bcreg_reserve(fs, 1);
            // bcemit_method(fs, ident, &key);
        }

        else {
            expr_tonextreg(fs, ident);
        }
    }

    OPENNODE(args-next) {
        READ(ExpDesc* args);
        js_ismethod = 0;

        // if (args->k == VCALL)  /* f(a, b, g()) or f(a, b, ...). */
        // setbc_b(bcptr(fs, args), 0);  /* Pass on multiple results. */

        expr_tonextreg(fs, args);
    }

    OPENNODE(typeof) {
        READ(ExpDesc* ident);

        internal_ref(fs, ident, "typeof");

        PUSH(ExpDesc* args);
    }

#define JS_OP_LEFT(OP, ID)                                                     \
    if (streq(type, OP)) {                                                  \
        READ(ExpDesc* e);                                                      \
        js_ismethod = 0;                                                       \
        bcemit_binop_left(fs, ID, e);                                          \
        PUSH(ExpDesc* op);                                                     \
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

    OPENNODE(=) {
        js_ismethod = 0;

        // checkcond(ls, VLOCAL <= lh->v.k && lh->v.k <= VINDEXED,
        // LJ_ERR_XSYNTAX);

        // /* Assign RHS to LHS and recurse downwards. */
        // expr_init(&e, VNONRELOC, ls->fs->freereg-1);
        // bcemit_store(ls->fs, &lh->v, &e);

        PUSH(ExpDesc* rval);
    }

    if (streq(type, "+=") || streq(type, "-=") || streq(type, "*=") ||
        streq(type, "/=") || streq(type, "%=")) {
        READ(ExpDesc* expr);
        js_ismethod = 0;

        // checkcond(ls, VLOCAL <= lh->v.k && lh->v.k <= VINDEXED,
        // LJ_ERR_XSYNTAX);

        // /* Assign RHS to LHS and recurse downwards. */
        // expr_init(&e, VNONRELOC, ls->fs->freereg-1);
        // bcemit_store(ls->fs, &lh->v, &e);

        
        // expr_tonextreg(fs, expr);

        PUSH(ExpDesc* key);
        PUSH(ExpDesc* rval);

        *key = *expr;

        if (expr->k == VINDEXED) {
            // TODO: overwrite previous expr to save a MOV.
            bcemit_AD(fs, BC_MOV, fs->freereg, fs->freereg - 1);
            // expr->u.s.info += 1;

            // Dispatch key to register.
            expr_tonextreg(fs, key);
        }
    }

    if (streq(type, "while-test") || streq(type, "for-test")) {
        js_ismethod = 0;

        PUSH(BCPos* start);
        PUSH(BCPos* loop);
        PUSH(ExpDesc* test);

        *start = fs->lasttarget = fs->pc;
    }

    OPENNODE(for-update) {
        READ(BCPos* start, BCPos* loop, ExpDesc* test);
        js_ismethod = 0;

        PUSH(BCPos* jmpins);
        PUSH(BCPos* preupdate);
        PUSH(ExpDesc* update);

        // if (v.k == VKNIL) v.k = VKFALSE;
        bcemit_branch_t(fs, test);
       
        *loop = bcemit_AD(fs, BC_LOOP, fs->nactvar, 0);
        *jmpins = bcemit_AJ(fs, BC_JMP, fs->freereg, NO_JMP);
        *preupdate = fs->pc;
    }

    OPENNODE(for-body) {
        READ(BCPos* start, BCPos* loop, ExpDesc* test, BCPos* jmpins, BCPos* preupdate, ExpDesc* update);

        BCPos reloop = bcemit_AJ(fs, BC_JMP, fs->freereg, NO_JMP);
        jmp_patchins(fs, reloop, *start);

        expr_tonextreg(fs, update);

        jmp_patchins(fs, *jmpins, fs->pc);
        *start = *preupdate;

        POP(jmpins, preupdate, update);
    }

    OPENNODE(while-body) {
        READ(BCPos* start, BCPos* loop, ExpDesc* test);

        if (test->k == VKNIL) test->k = VKFALSE;
        bcemit_branch_t(fs, test);

        *loop = bcemit_AD(fs, BC_LOOP, fs->nactvar, 0);
    }

    if (streq(type, "while-end") || streq(type, "for-end")) {
        READ(BCPos* start, BCPos* loop, ExpDesc* test);

        // jmp_tohere(fs, test->f);

        jmp_patch(fs, bcemit_jmp(fs), *start);
        // lex_match(ls, TK_end, TK_while, line);
        // fscope_end(fs);
        jmp_tohere(fs, test->f);
        jmp_patchins(fs, *loop, fs->pc);
        
        POP(start, loop, test);
    }

    OPENNODE(if-test) {
        PUSH(ExpDesc* test);
    }

    OPENNODE(if-consequent) {
        READ(ExpDesc* test);

        if (test->k == VKNIL) test->k = VKFALSE;
        bcemit_branch_t(fs, test);
    }

    OPENNODE(if-alternate) {
        READ(ExpDesc* test);

        BCPos escapelist = NO_JMP;
        BCPos flist = test->f;
        jmp_append(fs, &escapelist, bcemit_jmp(fs));
        jmp_tohere(fs, test->f);
        test->f = escapelist;

    }

    OPENNODE(var-declarator) {
        js_ismethod = 2;

        PUSH(ExpDesc* ident);
    }

    OPENNODE(var-declarator-assign) {
        js_ismethod = 0;
        
        bcreg_reserve(fs, 1);
        
        PUSH(ExpDesc* value);
    }

    OPENNODE(var-declarator-no-assign) {
        READ(ExpDesc* e1);
        js_ismethod = 0;

        bcreg_reserve(fs, 1);

        PUSH(ExpDesc* e2);
        *e2 = *e1;
        e2->t = NO_JMP;
        e2->f = NO_JMP;
    }

    OPENNODE(if-no-alternate) {
        READ(ExpDesc* test);

        BCPos escapelist = NO_JMP;
        jmp_append(fs, &escapelist, test->f);
        test->f = escapelist;
    }

    OPENNODE(if-end) {
        READ(ExpDesc* test);

        jmp_tohere(fs, test->f);

        POP(test);
    }

    OPENNODE(ternary-consequent) {
        READ(ExpDesc* test);
        js_ismethod = 0;

        if (test->k == VKNIL) test->k = VKFALSE;
        bcemit_branch_t(fs, test);

        PUSH(ExpDesc* consequent);
    }

    OPENNODE(ternary-alternate) {
        READ(ExpDesc* test, ExpDesc* expr);
        js_ismethod = 0;

        expr_tonextreg(fs, expr);

        BCPos escapelist = NO_JMP;
        BCPos flist = test->f;
        jmp_append(fs, &escapelist, bcemit_jmp(fs));
        jmp_tohere(fs, test->f);
        test->f = escapelist;

    }

    OPENNODE(return-no-argument) {
        bcemit_INS(fs, BCINS_AD(BC_RET0, 0, 1));
    }

    OPENNODE(return-argument) {
        READ(ExpDesc* expr);

        bcemit_INS(fs, BCINS_AD(BC_RET1, expr_toanyreg(fs, expr), 2));
    }

    OPENNODE(array-literal-open) {
        READ(ExpDesc* e);
        is_arrayliteral = 1;

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

        PUSH(ExpDesc* key);
        expr_init(key, VKNUM, 0);
        setintV(&key->u.nval, (int)0);

        PUSH(ExpDesc* value);
    }

    OPENNODE(array-literal-next) {
        READ(ExpDesc* obj, ExpDesc* key, ExpDesc* val);

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        expr_free(fs, val);
        expr_free(fs, key);

        expr_init(key, VKNUM, 0);
        setintV(&key->u.nval, is_arrayliteral++);
    }

    OPENNODE(array-literal-close) {
        READ(ExpDesc* obj, ExpDesc* key, ExpDesc* val);
        is_arrayliteral = 0;

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        obj->k = VNONRELOC;
        obj->u.s.info = 2;

        POP(key, val);
    }

    OPENNODE(object-literal) {
        READ(ExpDesc* e);

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
    }

    OPENNODE(object-literal-key) {
        js_ismethod = 4;

        PUSH(ExpDesc* key);
    }

    OPENNODE(object-literal-value) {
        js_ismethod = 0;

        PUSH(ExpDesc* value);
    }

    OPENNODE(object-literal-push) {
        READ(ExpDesc* obj, ExpDesc* key, ExpDesc* val);

        expr_toanyreg(fs, val);
        if (expr_isk(key))
            expr_index(fs, obj, key);
        bcemit_store(fs, obj, val);

        expr_free(fs, val);
        // expr_free(fs, key);

        // expr_toanyreg(fs, obj);

        // JS_DEBUG("EUSAUX PC %p %d\n", obj, obj->u.s.aux);
        // BCIns *ip = &fs->bcbase[obj->u.s.aux].ins;
        // if (!needarr) narr = 0;
        // else if (narr < 3) narr = 3;
        // else if (narr > 0x7ff) narr = 0x7ff;
        // int nhash = 2;
        // setbc_d(ip, 0|(hsize2hbits(nhash)<<11));

        POP(key, val);
    }

    OPENNODE(VariableDeclarator) {
        READ(ExpDesc* ident, ExpDesc* val);

        if (ident->u.s.aux == -1) {
            expr_discharge(fs, val);
            expr_free(fs, val);
            bcreg_reserve(fs, 1);
            expr_toreg_nobranch(fs, val, fs->freereg - 1);

            assign_adjust(fs->ls, 1, 1, val);
            var_add(fs->ls, 1);

            if (val->k == VNONRELOC && val->u.s.info != fs->nactvar-1) {
                bcemit_AD(fs, BC_MOV, fs->nactvar-1, val->u.s.info);
            }
        } else {
            bcemit_store(fs, ident, val);
        }

        POP(ident, val);
    }

    OPENNODE(FunctionExpression) {
        READ(ExpDesc* expr);

        ptrdiff_t oldbase = 0;

        int line = 0;
        FuncState* pfs = js_fs_top(-1);
        GCproto* pt = fs_finish(ls, (ls->lastline = ls->linenumber));
        pfs->bcbase = ls->bcstack + oldbase; /* May have been reallocated. */
        pfs->bclim = (BCPos)(ls->sizebcstack - oldbase);
        /* Store new prototype in the constant array of the parent. */
        expr_init(
            expr, VRELOCABLE,
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
    }
    OPENNODE(Identifier) {
        READ(ExpDesc* ident);

        GCstr* s = create_str(fs, C.name);

        JS_DEBUG("[ident] value: '%s'\n", C.name);
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
    } 

    OPENNODE(AssignmentExpression) {
        if (streq(C._operator, "=")) {
            READ(ExpDesc* lval, ExpDesc* rval);

            bcemit_store(fs, lval, rval);
            *lval = *rval;

            POP(rval);
        } else {
            READ(ExpDesc* expr, ExpDesc* key, ExpDesc* incr);

            BinOpr op;
            if (streq(C._operator, "+=")) {
                op = OPR_ADD;
            } else if (streq(C._operator, "-=")) {
                op = OPR_SUB;
            } else if (streq(C._operator, "*=")) {
                op = OPR_MUL;
            } else if (streq(C._operator, "/=")) {
                op = OPR_DIV;
            } else if (streq(C._operator, "%=")) {
                op = OPR_MOD;
            } else {
                assert(0);
            }

            if (expr->k == VINDEXED) {
                // Add increment to key. If not prefixed, do this in separate
                // register.
                bcemit_binop(fs, op, key, incr);
                expr_free(fs, incr);

                // Store and save return value.
                bcemit_store(fs, expr, key);
                expr->k = VRELOCABLE;
                expr->u.s.info = fs->pc;

                // Free registers.
                expr_free(fs, key);
            } else {
                // Add increment to key.
                bcemit_binop(fs, op, key, incr);
                if (expr->k == VLOCAL) {
                    // Save in original location.
                    expr_toreg(fs, key, key->u.s.aux);
                }

                // Store and save return value.
                if (expr->k == VGLOBAL) {
                    bcemit_store(fs, expr, key);
                    expr->k = VRELOCABLE;
                    expr->u.s.info = fs->pc;

                    // Free registers.
                    expr_free(fs, key);
                }
            }

            POP(key, incr);
        }
    }

    OPENNODE(ConditionalExpression) {
        READ(ExpDesc* test, ExpDesc* result);

        fs->freereg--;
        expr_tonextreg(fs, result);
        jmp_tohere(fs, test->f);
        *test = *result;

        POP(result);
    }

    OPENNODE(ExpressionStatement) {
        READ(ExpDesc* expr);
        js_ismethod = 0;

        if (expr->k == VCALL) { /* Function call statement. */
            setbc_b(bcptr(fs, expr), 1); /* No results. */
        } else { /* Start of an assignment. */
            // vl.prev = NULL;
            // parse_assignment(ls, &vl, 1);
            JS_DEBUG("TODO: assignment\n");
        }

        // expr_tonextreg(fs, expr);
        lua_assert(fs->framesize >= fs->freereg && fs->freereg >= fs->nactvar);
        fs->freereg = fs->nactvar;

        POP(expr);
    }

    if (streq(C.type, "CallExpression")
               || streq(C.type, "NewExpression")
               || (streq(C.type, "UnaryExpression")
                   && streq(C._operator, "typeof"))) {
        READ(ExpDesc* ident, ExpDesc* args);

        if (C.arguments == 0) { // f().
            args->k = VVOID;
        } else {
            // if (args->k == VCALL)   f(a, b, g()) or f(a, b, ...).
            //   setbc_b(bcptr(fs, args), 0);  /* Pass on multiple results. */
        }

        lua_assert(ident->k == VNONRELOC);
        BCReg base = ident->u.s.info; /* Base register for call. */
        // JS_DEBUG("THIS IS THE BASE %p %d\n", ident, base);
        if (args->k != VVOID)
            expr_tonextreg(fs, args);
        BCIns ins = BCINS_ABC(BC_CALL, base, 2, fs->freereg - base);
        expr_init(ident, VCALL, bcemit_INS(fs, ins));
        ident->u.s.aux = base;
        fs->bcbase[fs->pc - 1].line = 0;
        fs->freereg = base + 1; /* Leave one result by default. */

        POP(args);
    }

    OPENNODE(Literal) {
        READ(ExpDesc* args);

        GCstr* str = NULL;
        switch (C.value_type) {
        case JS_BOOLEAN:
            expr_init(args, C.value_boolean ? VKTRUE : VKFALSE, 0);
            break;

        case JS_STRING:
            expr_init(args, VKSTR, 0);
            str = create_str(fs, C.value_string);
            args->u.sval = str;
            break;

        case JS_DOUBLE:
            expr_init(args, VKNUM, 0);
            setnumV(&args->u.nval, C.value_double);
            break;

        default:
            // TODO: Workaround for parser
            if (streq(C.raw, "true")) {
                expr_init(args, VKTRUE, 0);
            } else if (streq(C.raw, "false")) {
                expr_init(args, VKFALSE, 0);
            } else if (streq(C.raw, "null")) {
                expr_init(args, VKNIL, 0);
            } else {
                assert(0);
            }
        }
    }

    if (streq(C.type, "UnaryExpression") && !streq(C._operator, "typeof")) {
        READ(ExpDesc* e1, ExpDesc* e2);

        *e1 = *e2;

        if (streq(C._operator, "-")) {
            if (expr_isnumk(e1) && !expr_numiszero(e1)) {  /* Avoid folding to -0. */
                TValue *o = expr_numtv(e1);
                if (tvisint(o)) {
                    int32_t k = intV(o);
                    if (k == -k)
                        setnumV(o, -(lua_Number)k);
                    else
                        setintV(o, -k);
                } else {
                    o->u64 ^= U64x(80000000,00000000);
                }
            } else {
                expr_toanyreg(fs, e1);
                expr_free(fs, e1);
                e1->u.s.info = bcemit_AD(fs, BC_UNM, 0, e1->u.s.info);
                e1->k = VRELOCABLE;
            }
        }

        POP(e2);
    }

    OPENNODE(BinaryExpression) {
        READ(ExpDesc* e1, ExpDesc* e2);

        if (streq(C._operator, "==")) {
            bcemit_binop(fs, OPR_EQ, e1, e2);
        } else if (streq(C._operator, "!=")) {
            bcemit_binop(fs, OPR_NE, e1, e2);
        } else if (streq(C._operator, "<")) {
            bcemit_binop(fs, OPR_LT, e1, e2);
        } else if (streq(C._operator, ">=")) {
            bcemit_binop(fs, OPR_GE, e1, e2);
        } else if (streq(C._operator, "<=")) {
            bcemit_binop(fs, OPR_LE, e1, e2);
        } else if (streq(C._operator, ">")) {
            bcemit_binop(fs, OPR_GT, e1, e2);
        } else if (streq(C._operator, "+")) {
            bcemit_binop(fs, OPR_ADD, e1, e2);
        } else if (streq(C._operator, "-")) {
            bcemit_binop(fs, OPR_SUB, e1, e2);
        } else if (streq(C._operator, "*")) {
            bcemit_binop(fs, OPR_MUL, e1, e2);
        } else if (streq(C._operator, "/")) {
            bcemit_binop(fs, OPR_DIV, e1, e2);
        } else if (streq(C._operator, "%")) {
            bcemit_binop(fs, OPR_MOD, e1, e2);
        } else {
            assert(0);
        }

        POP(e2);
    }

    OPENNODE(LogicalExpression) {
        READ(ExpDesc* e1, ExpDesc* e2);

        if (streq(C._operator, "&&")) {
            bcemit_binop(fs, OPR_AND, e1, e2);
        } else if (streq(C._operator, "||")) {
            bcemit_binop(fs, OPR_OR, e1, e2);
        } else {
            assert(0);
        }

        POP(e2);
    }

    OPENNODE(Program) {
        js_fs_pop();
    }
    
    OPENNODE(Property) {
    }

    OPENNODE(ThisExpression) {
        READ(ExpDesc* expr);

        GCstr* s = create_str(fs, "this");
        var_lookup_(fs, s, expr, 1);
    }

    OPENNODE(ArrayExpression) {
    }

    OPENNODE(ObjectExpression) {
        READ(ExpDesc* e);

        // lex_check(ls, '{');
        // snip...!
        // lex_match(ls, '}', '{', line);
        // if (pc == fs->pc-1) {  /* Make expr relocable if possible. */
        // fs->freereg--;
        e->k = VNONRELOC;
        e->u.s.info = fs->freereg - 1;

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
    }

    OPENNODE(UpdateExpression) {
        READ(ExpDesc* expr);

        if (expr->k == VINDEXED) {
            // Create key register to take register of base.
            ExpDesc key = *expr;

            // TODO: overwrite previous expr to save a MOV.
            bcemit_AD(fs, BC_MOV, fs->freereg, fs->freereg - 1);
            expr->u.s.info += 1;

            // Create increment value.
            ExpDesc incr;
            expr_init(&incr, VKNUM, 0);
            setnumV(&incr.u.nval, streq(C._operator, "--") ? -1 : 1);

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
            setnumV(&incr.u.nval, streq(C._operator, "--") ? -1 : 1);

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
    }

    if (streq(C.type, "ReturnStatement")
               || streq(C.type, "MemberExpression")
               || streq(C.type, "VariableDeclaration")
               || streq(C.type, "UpdateExpression")
               || streq(C.type, "BlockStatement")
               || streq(C.type, "IfStatement")
               || streq(C.type, "NewExpression")
               || streq(C.type, "WhileStatement")
               || streq(C.type, "ForStatement")) {
        // noop
    }
}



void my_onopennode(const char* type)
{
    FuncState* fs = js_fs_top(0);

    JS_DEBUG("[>] %s\n", type);

    // Conditions.
    if (streq(type, "parseExpression") && is_statement) {
        type = "expression-statement";
    }

    if (streq(type, "parseStatement")) {
        is_statement = 1;
        js_ismethod = 0;
    } else {
        is_statement = 0;
    }

    if (streq(type, "parseExprList-next") && is_arrayliteral == 0) {
        type = "args-next";
    }
    if (streq(type, "parseExprList-next") && is_arrayliteral > 0) {
        type = "array-literal-next";
    }

    struct Node_C C = { 0 };
    C.type = "lolno";
    handle_node(fs, type, C);
}

void my_onclosenode(struct Node_C C)
{
    FuncState* fs = js_fs_top(0);

    JS_DEBUG("[<] %s\n", C.type);
    // JS_DEBUG("<- finish %s %s %s %d\n", C.type, C.name, C.raw, C.arguments);

    // Workaround for typeof to act like a function.
    if ((streq(C.type, "UnaryExpression")
         && streq(C._operator, "typeof"))) {
        READ(ExpDesc* args);

        expr_tonextreg(fs, args);
    }

    handle_node(fs, C.type, C);
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
    var_new(ls, 0, create_str(fs, ""));
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

    assert(js_fs.idx == 0);

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
