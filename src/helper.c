#include <math.h>
#include <string>
#include <vector>

#define LOGICALOR(A,B) (A ? A : B)

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
#define Infinity INFINITY

uint32_t DBL_NULL_VAL = 0x7fc00001;
#define DBL_NULL *((double*) (&DBL_NULL_VAL))

bool ISNULL (double val)
{
	return *((uint32_t*) &val) == DBL_NULL_VAL;
}

enum {
	ATOM_NULL,
	ATOM_TRUE,
	ATOM_FALSE
} ATOM_VALUE;


std::string fromCharCode (int c) {
	return std::string(1, (char) c);
}

int parseInt (std::string c) {
	if (c.length() == 0) {
		return nan("");
	}
	return std::stoi(c);
}

int parseInt (std::string c, int radix) {
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
	return arr.substr(start,end);
}

int charCodeAt(std::string input, int idx)
{
	if (idx < 0 || input.length() <= idx) {
		return -1;
	}
	return input.at(idx);
}

std::string charAt(std::string input, int idx)
{
	if (idx < 0 || input.length() <= idx) {
		return std::string("");
	}
	return std::string(1, input.at(idx));
}

template<class T>
int push(std::vector<T> value, T idx)
{
	value.push_back(idx);
	return value.size();
}

template<class T>
int push(std::vector<T> value, std::nullptr_t)
{
	value.push_back(nullptr);
	return value.size();
}

template<class T>
T pop(std::vector<T> value)
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

struct js_t {
	int type;
	union {
		bool value_bool;
		double value_double;
		std::string* value_string;
	};
};

enum {
	JS_NULL,
	JS_DOUBLE,
	JS_STRING,
	JS_BOOLEAN
} js_t_val;

struct js_t js_null_t() {
	struct js_t val = {};
	val.type = JS_NULL;
	return val;
}

struct js_t js_string_t(std::string* str) {
	struct js_t val = {};
	val.type = JS_STRING;
	val.value_string = str;
	return val;
}

struct js_t js_double_t(double value) {
	struct js_t val = {};
	val.type = JS_DOUBLE;
	val.value_double = value;
	return val;
}

struct js_t js_bool_t(bool value) {
	struct js_t val = {};
	val.type = JS_BOOLEAN;
	val.value_bool = value;
	return val;
}



/**
 * regexp stuff
 */

bool test(auto regex, std::string input)
{
	return false;
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
    bool operator&&(bool value ) {
    	return false && value;
    }
    int index;
    RegExpVector();
    virtual ~RegExpVector();
};

RegExpVector::RegExpVector ()
{

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
	char* keyword;
	bool postfix;
	bool prefix;
	char* type;
};

bool operator== (struct keyword_t & left, struct keyword_t & right){
    return left.type == right.type;
}

bool operator!= (struct keyword_t & left, struct keyword_t & right){
    return !(left == right);
}


keyword_t keywordTypes (std::string key) {
	return keyword_t();
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
	std::vector<Node*> bodyarr;
	Node* label;
	Node* test;
	Node* consequent;
	std::vector<Node*> consequents;
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
	Node* opr;
	bool prefix;
	Node* property;
	bool computed;
	Node* callee;
	std::vector<Node*> arguments;
	Node* key;
	Node* value;
	std::string raw;
	std::vector<Node*> elements;
	std::vector<Node*> properties;
	Node* id;
	Node* param;
	std::vector<Node*> params;
	Node* rest;
	Node* guard;
	std::string name;

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





/**
 * options struct
 */

typedef struct {
	int ecmaVersion;
	bool strictSemicolons;
	bool allowTrailingCommas;
	bool forbidReserved;
	bool allowReturnOutsideFunction;
	bool locations;
	void (*onComment)();
	bool ranges;
	Node* program;
	std::string sourceFile;
	std::string directSourceFile;
} options_t;



/**
 * this should be auto-generated...
 */

void finishToken (keyword_t type, struct js_t ptr);
void finishToken (keyword_t type, struct regexp_t value) { finishToken(type, js_null_t()); }
void finishToken (keyword_t type, std::string value) { finishToken(type, js_string_t(&value)); }
void finishToken (keyword_t type, double value) { finishToken(type, js_double_t(value)); }
void finishToken (keyword_t type) { finishToken(type, js_null_t()); }

void onComment(options_t options, bool what, std::string code, int start, int tokPos,
                        int startLoc, bool ok) {

}

void raise (int start, std::string message){

}
