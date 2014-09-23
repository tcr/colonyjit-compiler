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

    // default:
        // assert(0);
    }
}

/*
static void increment_pos(BCIns* ins)
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
    case BC_TGETS:
    case BC_ADDVV:
    case BC_SUBVV:
    case BC_MULVV:
    case BC_DIVVV:
    case BC_MODVV:
    case BC_POW:
    case BC_CAT:
    case BC_TGETV:
    case BC_TSETV:
    case BC_MOV:
    case BC_NOT:
    case BC_UNM:
    case BC_LEN:
    case BC_KNIL:
    case BC_USETV:
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
    case BC_FUNCF:
    case BC_IFUNCF:
    case BC_JFUNCF:
    case BC_FUNCV:
    case BC_IFUNCV:
    case BC_JFUNCV:
    case BC_FUNCC:
    case BC_FUNCCW:
    case BC_GGET:
    case BC_JMP:
        break;

    case BC_LOOP:
    case BC_ILOOP:
    case BC_JLOOP:
    case BC_ISLT:
    case BC_ISGE:
    case BC_ISLE:
    case BC_ISGT:
    case BC_ISEQV:
    case BC_ISNEV:
    case BC_ISTC:
    case BC_ISFC:
    case BC_IST:
    case BC_ISF:
    case BC_ISEQS:
    case BC_ISNES:
    case BC_ISEQN:
    case BC_ISNEN:
    case BC_ISEQP:
    case BC_ISNEP:
    	JS_DEBUG("\t\t\t\t\t\tHEY MAN\n");
        setbc_d(ins, bc_d(*ins) - 1);
    	break;

    default:
        assert(0);
    }
}
*/