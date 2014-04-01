#include <math.h>
#include <string>
#include <vector>


bool operator&& (std::string & left, bool right){
    return left.length() > 0 && right;
}

bool operator! (std::string & left){
    return left.length() == 0;
}

#define null nullptr
#define Infinity INFINITY

uint32_t DBL_NULL_VAL = 0x7fc00001;
#define DBL_NULL *((double*) (&DBL_NULL_VAL))

bool ISNULL (double val)
{
	return *((uint32_t*) &val) == DBL_NULL_VAL;
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



enum {
	ATOM_NULL,
	ATOM_TRUE,
	ATOM_FALSE
} ATOM_VALUE;


std::string fromCharCode (int c) {
	return "";
}

int parseInt (std::string c) {
	return 0;
}

int parseInt (std::string c, int radix) {
	return 0;
}

double parseFloat (std::string c) {
	return 0;
}

std::vector<int> slice (std::vector<int> arr, int start, int end)
{
	return arr;
}

std::string slice (std::string arr, int start, int end)
{
	return arr;
}

RegExpVector exec(auto regex, std::string input)
{
	return nullptr;
}

int charCodeAt(std::string input, int idx)
{
	return 0;
}

std::string charAt(std::string input, int idx)
{
	return "";
}

int push(std::vector<int> value, int idx)
{
	return 0;
}

bool test(auto regex, std::string input)
{
	return false;
}

int indexOf(std::string input, std::string needle, int offset)
{
	return 0;
}

int indexOf(std::string input, std::string needle)
{
	return indexOf(input, needle, 0);
}




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

struct regexp_t RegExp(std::string str) {
	return { str };
}

struct regexp_t RegExp(std::string str, std::string mods) {
	return { str };
}

auto SyntaxError(std::string str) {
	return str;
}


struct this_t {
	int line;
	int column;
	std::string type;
	int start;
	int end;
	std::string source;
};

struct this_t THIS;


auto readInt (auto radix) { return readInt (radix, 0); }

auto readToken (auto forceRegexp);
bool readToken () { return readToken (false); }

std::string readWord1 (void);

void readNumber (bool startsWithDot);
void skipSpace ();

void readRegexp ();

void finishOp(keyword_t type, int size);

void finishToken (keyword_t type, void* ptr);
void finishToken (keyword_t type) { finishToken(type, nullptr); }

void onComment(options_t options, bool what, std::string code, int start, int tokPos,
                        int startLoc, bool ok) {

}



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

class node_t {
  public:
    std::string type;
    int start;
    int end;
    node_loc_t* loc;

std::string sourceFile;
std::vector<int> range;
// body
// label
// test
// consequent
// alternate
// argument
// discriminant
// cases
// block
// handler
// guardedHandlers
// finalizer
// object
// expression
// init
// update
// left
// right
// declarations
// kind
// expressions
// operator
// prefix
// property
bool computed;
// callee
// arguments
// value
// raw
// elements
// properties
std::string id;
// params
// name

    node_t ();
};

node_t::node_t () {
	this->type = nullptr;
	this->start = tokStart;
	this->end = DBL_NULL;
	this->loc = nullptr;
}

extern struct regexp_t lineBreak;