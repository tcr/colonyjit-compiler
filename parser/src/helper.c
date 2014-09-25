#include <math.h>
#include <string>
#include <vector>

double NaN = strtod("NaN", NULL);
double Infinity = strtod("Inf", NULL);

#define isNaN isnan

#define LOGICALOR(A,B) ({ auto left = A; left ? left : B; })

bool operator&& (std::string & left, bool right){
    return left.length() > 0 && right;
}

bool operator== (std::string & left, int right){
    return left.length() > 0;
}

std::string operator+ (std::string left, int right){
    return left;
}

bool operator! (std::string & left){
    return left.length() == 0;
}

bool ISNOTNULL (int val)
{
	return val >= 0;
}

bool ISNOTNULL (std::string str)
{
	return str.length() != 0;
}

#define null nullptr

uint32_t DBL_NULL_VAL = 0x7fc00001;
#define DBL_NULL *((double*) (&DBL_NULL_VAL))

bool ISNULL (double val)
{
	return *((uint32_t*) &val) == DBL_NULL_VAL;
}

bool ISNULL (std::string str)
{
	return str.length() == 0;
}

enum {
	ATOM_NULL,
	ATOM_TRUE,
	ATOM_FALSE
} ATOM_VALUE;


std::string fromCharCode (int c) {
	return std::string(1, (char) c);
}

std::string fromCharCode (int c, int d) {
	char buf[2] = {(char) c, (char) d};
	return std::string((const char*) buf, 2);
}

double parseInt (std::string c) {
	if (c.length() == 0) {
		return nan("");
	}
	return std::stoi(c);
}

double parseInt (std::string c, int radix) {
	if (c.length() == 0) {
		return nan("");
	}
	return std::stoi(c, 0, radix);
}

double parseFloat (std::string c) {
	return std::stod(c);
}

std::string slice (std::string arr, int start, int end)
{
	// TODO check negative indices
	return arr.substr(start,end - start);
}

int charCodeAt(std::string input, int idx)
{
	if (idx < 0 || input.length() <= idx) {
		return -1;
	}
	return input.c_str()[idx];
}

std::string charAt(std::string input, int idx)
{
	if (idx < 0 || input.length() <= idx) {
		return std::string("");
	}
	return std::string(1, input.at(idx));
}

template<class T>
int push(std::vector<T> &value, T idx)
{
	value.push_back(idx);
	return value.size();
}

template<class T>
int push(std::vector<T> &value, std::nullptr_t)
{
	value.push_back(nullptr);
	return value.size();
}

template<class T>
T pop(std::vector<T> &value)
{
	T val = value.back();
	value.pop_back();
	return val;
}

int indexOf(std::string input, std::string needle, int offset)
{
	std::string::size_type n = input.find(needle, offset);
	return n;
}

int indexOf(std::string input, std::string needle)
{
	return indexOf(input, needle, 0);
}

int lastIndexOf(std::string input, std::string needle, int offset)
{
	std::string::size_type n = input.rfind(needle, offset);
	return n;
}

// auto SyntaxError(std::string str) {
// 	return str;
// }




/**
 * any type
 */

class js_any_type {
	public:
		js_any_type_val type;
		bool value_boolean;
		double value_double;
		std::string value_string;
		void* value_node;

		js_any_type();
		js_any_type(std::string value);
		js_any_type(bool value);
		js_any_type(double value);
		js_any_type(void* value);

	std::string& operator= (std::string & right){
		this->type = JS_STRING;
		this->value_string = right;
		return right;
	}

	bool operator== (const char* str) {
		return this->type == JS_STRING && this->value_string == str;
	}
	bool operator!= (const char* str) {
		return this->type != JS_STRING || this->value_string != str;
	}

	operator std::string const &() const { return this->value_string; }
	operator void* const &() const { return this->value_node; }
};

std::string operator+ (std::string left, js_any_type & right){
    return left + right.value_string;
}

js_any_type::js_any_type() {
	this->type = JS_NULL;
}

js_any_type::js_any_type(std::string value) {
	this->type = JS_STRING;
	this->value_string = value;
}

js_any_type::js_any_type(bool value) {
	this->type = JS_BOOLEAN;
	this->value_boolean = value;
}

js_any_type::js_any_type(double value) {
	this->type = JS_DOUBLE;
	this->value_double = value;
}

js_any_type::js_any_type(void* value) {
	this->type = JS_OBJECT;
	this->value_node = value;
}



/**
 * regexp stuff
 */

bool test(bool (*regex)(std::string), std::string input)
{
	return regex(input);
}

class RegExpVector: private std::vector<std::string>
{
    typedef std::string T;
    typedef std::vector<std::string> vector;
public:
    using vector::push_back;
    using vector::operator[];
    using vector::begin;
    using vector::end;
    RegExpVector operator*(const RegExpVector & ) const;
    RegExpVector operator+(const RegExpVector & ) const;
    operator bool() { return (size() != 0); }
    bool operator&&(bool value ) {
    	return false && value;
    }
    int index;
    RegExpVector();
    virtual ~RegExpVector();
};

RegExpVector::RegExpVector ()
{
	push_back("");
}

RegExpVector::~RegExpVector ()
{
	
}

RegExpVector exec(auto regex, std::string input)
{
	return RegExpVector();
}

struct regexp_t {
	std::string str;
	int lastIndex;
	int index;
};

bool ISNULL (struct regexp_t val)
{
	return val.str.length() == 0;
}

bool operator== (struct regexp_t & left, std::nullptr_t n){
    return false;
}

struct regexp_t RegExp(std::string str) {
	return { str };
}

struct regexp_t RegExp(std::string str, std::string mods) {
	return { str };
}

bool test(regexp_t regex, std::string input)
{
	return false;
}


/**
 * keyword struct
 */

struct keyword_t {
	int _id;
	int atomValue;
	bool beforeExpr;
	int binop;
	bool isAssign;
	bool isLoop;
	bool isUpdate;
	const char* keyword;
	bool postfix;
	bool prefix;
	const char* type;
};

bool operator== (struct keyword_t & left, struct keyword_t & right){
    return left._id == right._id;
}

bool operator!= (struct keyword_t & left, struct keyword_t & right){
    return !(left == right);
}

/**
 * "this" struct
 */

struct this_t {
	int line;
	int column;
	std::string type;
	int start;
	int end;
	std::string source;
};

struct this_t THIS;
 


/**
 * SourceLocation struct
 */

extern int tokStart;
extern int tokStartLoc;
extern std::string sourceFile;

class SourceLocation {
  public:
    std::string source;
    int start;
    int end;
    SourceLocation ();
};

SourceLocation::SourceLocation () {
	this->start = tokStartLoc;
	this->end = DBL_NULL;
	this->source = sourceFile;
}



/**
 * label struct
 */

class label_t {
  public:
    std::string kind;
    std::string name;
};





/**
 * node struct
 */

class Node {
  public:
    std::string type;
    int start;
    int end;
    SourceLocation* loc;

	std::string sourceFile;
	std::vector<int> range;
	Node* body;
	std::vector<Node*> bodylist;
	Node* label;
	Node* test;
	Node* declaration;
	Node* source;
	std::vector<Node*> specifiers;
	Node* consequent;
	std::vector<Node*> consequents;
	std::vector<Node*> defaults;
	Node* alternate;
	Node* argument;
	Node* discriminant;
	std::vector<Node*> cases;
	Node* block;
	Node* handler;
	std::vector<Node*> guardedHandlers;
	Node* finalizer;
	Node* object;
	Node* expression;
	Node* init;
	Node* update;
	Node* left;
	Node* right;
	std::vector<Node*> declarations;
	std::string kind;
	std::vector<Node*> expressions;
	bool prefix;
	Node* property;
	bool computed;
	Node* callee;
	std::vector<Node*> arguments;
	Node* key;
	js_any_type value;
	std::string raw;
	std::vector<Node*> elements;
	std::vector<Node*> properties;
	Node* id;
	Node* param;
	std::vector<Node*> params;
	std::vector<Node*> blocks;
	Node* rest;
	Node* guard;
	std::string name;
	bool generator;
	bool of;
	Node* quasi;
	std::vector<Node*> quasis;
	Node* tag;
	bool delegate;
	bool _default;
	bool _static;
	std::string _operator;
	Node* filter;
	bool method;
	bool tail;
	bool shorthand;
	Node* superClass;

    Node ();
};

Node::Node () {
	this->type = std::string("");
	this->start = tokStart;
	this->end = DBL_NULL;
	this->loc = nullptr;
}

bool ISNULL (Node* t)
{
	return t == nullptr;
}

int Number (bool fact)
{
	return (int) fact;
}

#include <string.h>
#include <assert.h>

const char* leak_clone (std::string str)
{
	char* newstr = (char*) calloc(1, str.size() + 1);
	memcpy(newstr, str.c_str(), str.size());
	return (const char*) newstr;
}

struct Node_C convert_to_Node_C (Node* node) {
	assert(node->type.size() != 0);

	struct Node_C C;
	C.type = leak_clone(node->type);
	C.start = node->start;
	C.end = node->end;
	C.name = leak_clone(node->name);
	C.raw = leak_clone(node->raw);
	C.value_type = node->value.type;
	C.value_string = leak_clone(node->value.value_string);
	C.value_double = node->value.value_double;
	C.value_boolean = node->value.value_boolean;
	C.arguments = node->arguments.size();
	C._operator = leak_clone(node->_operator);
	C.prefix = node->prefix;
	return C;
}


/**
 * options struct
 */

/*
{ecmaVersion: 5,
	strictSemicolons: false,
	allowTrailingCommas: true,
	forbidReserved: "",
	allowReturnOutsideFunction: false,
	locations: false,
	ranges: true,
	program: null,
	sourceFile: "",
	directSourceFile: ""}; 
*/

typedef struct {
	int ecmaVersion;
	bool strictSemicolons;
	bool allowTrailingCommas;
	std::string forbidReserved;
	bool allowReturnOutsideFunction;
	bool locations;
	// void (*onComment)();
	bool ranges;
	Node* program;
	std::string sourceFile;
	std::string directSourceFile;
} options_t;



/**
 * this should be auto-generated...
 */

int finishToken (keyword_t type, js_any_type val);
int finishToken (keyword_t type, std::string value) { return finishToken(type, js_any_type(value)); }
int finishToken (keyword_t type, bool value) { return finishToken(type, js_any_type(value)); }
int finishToken (keyword_t type, double value) { return finishToken(type, js_any_type(value)); }
int finishToken (keyword_t type, int value) {
	printf("asint %d\n", value);
	return finishToken(type, (double) value);
}
int finishToken (keyword_t type, struct regexp_t value) { return finishToken(type, ""); } // TODO
int finishToken (keyword_t type) { return finishToken(type, js_any_type()); }

void onComment(options_t options, bool what, std::string code, int start, int tokPos,
                        int startLoc, bool ok) {

}

void raise (int start, std::string message){
	printf("ERROR: %s %d\n", message.c_str(), start);
	exit(1);
}

void checkLVal (...)
{
}

bool isUseStrict (...)
{
return false;
}

Node* parseTemplate()
{
	return nullptr;
}

Node* toAssignable(Node* node, bool a, bool b)
{
	return node;
}

Node* toAssignable(Node* node, bool a)
{
	return node;
}

Node* toAssignable(Node* node)
{
	return node;
}
