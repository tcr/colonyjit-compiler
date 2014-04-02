#include <math.h>
#include <string>
#include <vector>


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
	return std::string((char) c);
}

int parseInt (std::string c) {
	return std::stoi(c);
}

int parseInt (std::string c, int radix) {
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
	return input.at(idx);
}

std::string charAt(std::string input, int idx)
{
	return std::string(input.at(idx));
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
	std::string program;
	std::string sourceFile;
	std::string directSourceFile;
} options_t;


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
    return false;
}

bool operator!= (struct keyword_t & left, struct keyword_t & right){
    return false;
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
 * node_loc_t struct
 */

extern int tokStart;
extern int tokStartLoc;
extern std::string sourceFile;

class node_loc_t {
  public:
    std::string source;
    int start;
    int end;
    node_loc_t ();
};

node_loc_t::node_loc_t () {
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

class node_t {
  public:
    std::string type;
    int start;
    int end;
    node_loc_t* loc;

	std::string sourceFile;
	std::vector<int> range;
	node_t* body;
	std::vector<node_t*> bodyarr;
	node_t* label;
	node_t* test;
	node_t* consequent;
	std::vector<node_t*> consequents;
	node_t* alternate;
	node_t* argument;
	node_t* discriminant;
	std::vector<node_t*> cases;
	node_t* block;
	node_t* handler;
	std::vector<node_t*> guardedHandlers;
	node_t* finalizer;
	node_t* object;
	node_t* expression;
	node_t* init;
	node_t* update;
	node_t* left;
	node_t* right;
	std::vector<node_t*> declarations;
	std::string kind;
	std::vector<node_t*> expressions;
	node_t* opr;
	bool prefix;
	node_t* property;
	bool computed;
	node_t* callee;
	std::vector<node_t*> arguments;
	node_t* key;
	node_t* value;
	std::string raw;
	std::vector<node_t*> elements;
	std::vector<node_t*> properties;
	node_t* id;
	node_t* param;
	std::vector<node_t*> params;
	node_t* guard;
	std::string name;

    node_t ();
};

node_t::node_t () {
	this->type = nullptr;
	this->start = tokStart;
	this->end = DBL_NULL;
	this->loc = nullptr;
}

bool ISNULL (node_t* t)
{
	return t == nullptr;
}





/**
 * this should be auto-generated...
 */

void finishToken (keyword_t type, void* ptr) { }
void finishToken (keyword_t type) { finishToken(type, nullptr); }

void onComment(options_t options, bool what, std::string code, int start, int tokPos,
                        int startLoc, bool ok) {

}

void raise (int start, std::string message){

}

#include "out.c"



/**
 * main
 */


int main () {
	return 0;
}