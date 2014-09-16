#include <stdint.h>
#include <stdio.h>

char stack[1024*1024];
size_t stack_ptr = 0;

#define CAT(a, ...) PRIMITIVE_CAT(a, __VA_ARGS__)
#define PRIMITIVE_CAT(a, ...) a ## __VA_ARGS__
#define NARGS_SEQ(_1,_2,_3,_4,_5,_6,_7,_8,N,...) N
#define NARGS(...) NARGS_SEQ(__VA_ARGS__, 8, 7, 6, 5, 4, 3, 2, 1)

#define STACKTYPE(A) _stacktype_ ## A

#define READ_AT(A, c) A = (void*) &stack[stack_ptr - sizeof(STACKTYPE(A)) - (c)]; assert(stack_ptr - sizeof(STACKTYPE(A)) - (c) >= 0);

#define READ_AT_1(A, c) 						READ_AT(A, c);
#define READ_AT_2(B, A, c) 						READ_AT(A, c); READ_AT_1(B, c + sizeof(STACKTYPE(A)));
#define READ_AT_3(C, B, A, c) 					READ_AT(A, c); READ_AT_2(C, B, c + sizeof(STACKTYPE(A)));
#define READ_AT_4(D, C, B, A, c) 				READ_AT(A, c); READ_AT_3(D, C, B, c + sizeof(STACKTYPE(A)));
#define READ_AT_5(E, D, C, B, A, c) 			READ_AT(A, c); READ_AT_4(E, D, C, B, c + sizeof(STACKTYPE(A)));
#define READ_AT_6(F, E, D, C, B, A, c) 			READ_AT(A, c); READ_AT_5(F, E, D, C, B, c + sizeof(STACKTYPE(A)));
#define READ_AT_7(G, F, E, D, C, B, A, c) 		READ_AT(A, c); READ_AT_6(G, F, E, D, C, B, c + sizeof(STACKTYPE(A)));
#define READ_AT_8(H, G, F, E, D, C, B, A, c) 	READ_AT(A, c); READ_AT_7(H, G, F, E, D, C, B, c + sizeof(STACKTYPE(A)));

#define READ(...) CAT(CAT(READ_AT, _), NARGS(__VA_ARGS__)) (__VA_ARGS__, 0)

#define POP_1(a) assert(stack_ptr - sizeof(*a) >= 0); stack_ptr -= sizeof(*a);
#define POP_2(b, a) POP_1(a); POP_1(b);
#define POP_3(c, b, a) POP_1(a); POP_2(c, b);
#define POP_4(d, c, b, a) POP_1(a); POP_3(d, c, b);
#define POP_5(e, d, c, b, a) POP_1(a); POP_4(e, d, c, b);
#define POP_6(f, d, c, b, a) POP_1(a); POP_5(f, e, d, c, b);
#define POP_7(g, f, d, c, b, a) POP_1(a); POP_6(g, f, e, d, c, b);
#define POP_8(h, g, f, d, c, b, a) POP_1(a); POP_7(h, g, f, e, d, c, b);
#define POP(...) CAT(CAT(POP, _), NARGS(__VA_ARGS__)) (__VA_ARGS__)

#define PUSH(A) (void*) &stack[stack_ptr]; stack_ptr += sizeof(A); assert(stack_ptr < sizeof(stack));
