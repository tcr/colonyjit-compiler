#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif


#ifndef _JS_PARSER_H_

	

typedef enum {
	JS_NULL,
	JS_DOUBLE,
	JS_STRING,
	JS_BOOLEAN,
	JS_OBJECT
} js_any_type_val;

struct Node_C {
const char* type;
int start;
int end;
// SourceLocation* loc;

// const char* sourceFile;
// int range;
// Node* body;
// int bodylist;
// Node* label;
// Node* test;
// Node* declaration;
// Node* source;
// int specifiers;
// Node* consequent;
// int consequents;
// int defaults;
// Node* alternate;
// Node* argument;
// Node* discriminant;
// int cases;
// Node* block;
// Node* handler;
// int guardedHandlers;
// Node* finalizer;
// Node* object;
// Node* expression;
// Node* init;
// Node* update;
// Node* left;
// Node* right;
// int declarations;
// const char* kind;
// int expressions;
int prefix;
// Node* property;
// bool computed;
// Node* callee;
int arguments;
// Node* key;
// Node* value;
int value_boolean;
js_any_type_val value_type;
const char* value_string;
double value_double;
const char* raw;
// int elements;
// int properties;
// Node* id;
// Node* param;
// int params;
// int blocks;
// Node* rest;
// Node* guard;
const char* name;
// bool generator;
// bool of;
// Node* quasi;
// int quasis;
// Node* tag;
// bool delegate;
// bool _default;
// bool _static;
const char* _operator;
// Node* filter;
// bool method;
// bool tail;
// bool shorthand;
// Node* superClass;
};

void jsparse (const char* buf, size_t buf_len,
	void (*jsparse_callback_open_)(const char* state),
	void (*jsparse_callback_close_)(struct Node_C C));

#endif

#ifdef __cplusplus
}
#endif