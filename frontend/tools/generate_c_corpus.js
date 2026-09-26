const fs = require('fs');
const path = require('path');

const ROOT = path.join(process.cwd(), 'c_syntax_corpus');
const SHARED_HEADER = path.join(ROOT, 'corpus_shared.h');

const VARIANTS = [
  { name: 'original', code: 'orig', indent: '    ' },
  { name: 'renamed', code: 'name', indent: '    ' },
  { name: 'restructured', code: 'struct', indent: '    ' },
  { name: 'formatted', code: 'fmt', indent: '  ' },
];

const GROUPS = [
  {
    number: 1,
    key: 'declaration_type_system',
    title: 'Declaration & Type System',
    count: 30,
    modes: 6,
    features: [
      'basic types, modifiers, storage classes',
      'typedefs, enums, structs, unions, bit fields',
      'variable-length arrays, compound literals, designated initializers',
      'pointer depth, const pointer vs pointer to const, void* casting',
      'function pointers, pointer to array vs array of pointers',
      'self-referential structs, file-scope and block-scope declarations',
    ],
    build: buildGroup1,
  },
  {
    number: 2,
    key: 'operators',
    title: 'Operators',
    count: 25,
    modes: 5,
    features: [
      'arithmetic, relational, logical, assignment',
      'bitwise, shift, increment, decrement',
      'conditional, comma, sizeof',
      'address-of, dereference, member access, array subscript',
      'cast chains and precedence edge cases',
    ],
    build: buildGroup2,
  },
  {
    number: 3,
    key: 'control_flow',
    title: 'Control Flow',
    count: 30,
    modes: 5,
    features: [
      'if / if-else / chained conditions',
      'switch, fall-through, break, default',
      'for loops with continue and empty clauses',
      'while / do-while with goto and labels',
      'infinite loops and GNU case ranges',
    ],
    build: buildGroup3,
  },
  {
    number: 4,
    key: 'functions',
    title: 'Functions',
    count: 25,
    modes: 5,
    features: [
      '0 to 10+ parameters and prototypes',
      'variadic functions and callback patterns',
      'recursive and mutually recursive functions',
      'inline and static functions returning pointers/structs',
      'old-style K&R definitions and main argc/argv/envp',
    ],
    build: buildGroup4,
  },
  {
    number: 5,
    key: 'preprocessor',
    title: 'Preprocessor',
    count: 20,
    modes: 5,
    features: [
      'object-like and function-like macros',
      'stringification, token pasting, undef',
      'conditional compilation with defined()',
      'quoted include, include guards, predefined macros',
      'X-macros, pragma, inactive #error',
    ],
    build: buildGroup5,
  },
  {
    number: 6,
    key: 'arrays_strings_pointers',
    title: 'Arrays, Strings & Pointers',
    count: 25,
    modes: 5,
    features: [
      'pointer arithmetic and null checks',
      'malloc/calloc/realloc/free and 2D dynamic arrays',
      'string traversal and const pointer forms',
      'arrays of function pointers and multidimensional arrays',
      'restrict aliasing, void*, safe freed-pointer handling',
    ],
    build: buildGroup6,
  },
  {
    number: 7,
    key: 'structs_unions_memory',
    title: 'Structs, Unions & Memory',
    count: 20,
    modes: 5,
    features: [
      'singly and doubly linked lists',
      'binary trees with recursive traversal',
      'hash table with open addressing',
      'union type punning and struct assignment',
      'flexible array members, offsetof, packed structs, opaque pointers',
    ],
    build: buildGroup7,
  },
  {
    number: 8,
    key: 'stdlib_usage',
    title: 'Standard Library Usage',
    count: 15,
    modes: 5,
    features: [
      'stdio file IO',
      'stdlib conversion, random, qsort, bsearch',
      'string and ctype routines',
      'math and time routines',
      'assert, setjmp, signal, optional OpenMP',
    ],
    build: buildGroup8,
  },
  {
    number: 9,
    key: 'expression_complexity',
    title: 'Expression Complexity',
    count: 10,
    modes: 5,
    features: [
      'deeply nested ternaries and comma operator',
      'multiple side effects and cast chains',
      'function call chains and compound literals',
      'array subscript on function call result',
      'mixed dereference, member access, and sizeof expressions',
    ],
    build: buildGroup9,
  },
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n', 'utf8');
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function renderSource({ title, features, includes, blocks, mainBody, indent = '    ', mainSignature = 'int main(void)' }) {
  const lines = [];
  lines.push(`/* Syntax Coverage: ${title} | Features: ${features.join(', ')} */`);
  lines.push(...includes.map((header) => `#include ${header}`));
  lines.push('');
  for (const block of blocks) {
    lines.push(block.trimEnd());
    lines.push('');
  }
  lines.push(`${mainSignature} {`);
  for (const line of mainBody) {
    lines.push(`${indent}${line}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function groupPrefix(groupNumber, fileIndex, variant) {
  return `g${pad2(groupNumber)}_${pad2(fileIndex)}_${variant.code}`;
}

function sharedHeader() {
  return `#ifndef CORPUS_SHARED_H
#define CORPUS_SHARED_H

#define CORPUS_CAT_INNER(a, b) a##b
#define CORPUS_CAT(a, b) CORPUS_CAT_INNER(a, b)
#define CORPUS_STRINGIFY_INNER(x) #x
#define CORPUS_STRINGIFY(x) CORPUS_STRINGIFY_INNER(x)

static inline int corpus_add(int lhs, int rhs) {
  return lhs + rhs;
}

static inline int corpus_mul(int lhs, int rhs) {
  return lhs * rhs;
}

#endif
`;
}

function baseUtilityBlocks(prefix) {
  return [
    `static void ${prefix}_print_label(const char *label, long value) {
  printf("%s=%ld\\n", label, value);
}

static int ${prefix}_clamp(int value, int low, int high) {
  if (value < low) {
    return low;
  }
  if (value > high) {
    return high;
  }
  return value;
}

static int ${prefix}_sum_ints(const int *values, size_t count) {
  int total = 0;
  for (size_t index = 0; index < count; ++index) {
    total += values[index];
  }
  return total;
}`,
  ];
}

function buildGroup1({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stddef.h>', '<stdint.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_file_scope = 11;
extern int ${prefix}_link_scope;
int ${prefix}_link_scope = 23;

typedef unsigned long ${prefix}_ulong;
typedef int (*${prefix}_binary_op)(int, int);

typedef struct ${prefix}_point {
  int x;
  int y;
} ${prefix}_point;

typedef union ${prefix}_number {
  int i;
  double d;
} ${prefix}_number;

typedef enum ${prefix}_mode {
  ${prefix}_mode_alpha = 1,
  ${prefix}_mode_beta,
  ${prefix}_mode_gamma = 7
} ${prefix}_mode;

struct ${prefix}_flags {
  unsigned ready : 1;
  unsigned count : 3;
  unsigned spare : 4;
};

static int ${prefix}_add(int lhs, int rhs) {
  return lhs + rhs;
}

static int ${prefix}_scale_point(${prefix}_point point, int factor) {
  return point.x * factor + point.y;
}

static ${prefix}_binary_op ${prefix}_select_op(int use_add) {
  return use_add ? ${prefix}_add : corpus_add;
}`,
  ];

  const numericList = mode % 2 === 0 ? '1, 2, 3, 4' : '5, 6, 7, 8';
  const localIndent = variant.indent;
  const body = [];
  body.push(`auto int auto_value = ${mode + 4};`);
  body.push(`register int register_value = ${mode + 5};`);
  body.push(`const int const_scalar = ${mode + 6};`);
  body.push(`volatile int volatile_scalar = ${mode + 7};`);
  body.push('int mutable_value = 42;');
  body.push('int *const const_pointer = &mutable_value;');
  body.push('const int *pointer_to_const = &const_scalar;');
  body.push('void *generic = &mutable_value;');
  body.push('int matrix[2][3] = {{1, 2, 3}, {4, 5, 6}};');
  body.push('int (*pointer_to_row)[3] = matrix;');
  body.push('int *pointer_array[2] = {&matrix[0][0], &matrix[1][0]};');
  body.push('int **double_pointer = pointer_array;');
  body.push('int ***triple_pointer = &double_pointer;');
  body.push(`int vla_count = ${mode + 3};`);
  body.push('int vla[vla_count];');
  body.push(`for (int index = 0; index < vla_count; ++index) { vla[index] = index + ${mode}; }`);
  body.push(`const ${prefix}_point point = (const ${prefix}_point){ .x = ${mode + 2}, .y = ${mode + 3} };`);
  body.push(`struct ${prefix}_flags flags = { .ready = 1, .count = ${mode & 3} };`);
  body.push(`const ${prefix}_number number = { .i = ${mode + 9} };`);
  body.push(`const ${prefix}_mode mode_value = ${prefix}_mode_gamma;`);
  body.push(`const int designated[4] = { [0] = ${mode + 1}, [2] = ${mode + 5}, [3] = ${mode + 9} };`);
  body.push(`const int *const_ptr_to_const = &designated[0];`);
  body.push(`int pointer_sum = ${prefix}_sum_ints(designated, 4);`);
  body.push(`int chosen = ${prefix}_select_op(mode_value & 1)(auto_value, register_value);`);
  body.push(`int scaled = ${prefix}_scale_point(point, 2);`);
  body.push(`long pointer_depth = (long)(*triple_pointer != NULL);`);
  body.push(`long cast_from_void = (long)*(int *)generic;`);
  body.push(`long modifier_mix = (long)(mutable_value + *const_pointer + *pointer_to_const + const_ptr_to_const[0]);`);
  body.push(`${prefix}_print_label("file_scope", ${prefix}_file_scope + ${prefix}_link_scope);`);
  body.push(`${prefix}_print_label("numeric", number.i + chosen + scaled + pointer_sum + (int)pointer_depth + (int)cast_from_void + (int)modifier_mix);`);
  body.push(`${prefix}_print_label("vla_tail", vla[vla_count - 1]);`);
  if (mode % 2 === 0) {
    body.push(`${prefix}_print_label("designated", designated[2]);`);
  } else {
    body.push(`${prefix}_print_label("designated", designated[3]);`);
  }
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: localIndent });
}

function buildGroup2({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stdint.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_mix(int a, int b, int c) {
  int result = a + b * c - a / (b + 1);
  result += (a == b) || (b != c);
  result ^= (a & b) | (c << 1);
  result += (a > b ? a : b);
  result -= (c < a ? c : a);
  return result;
}

static int ${prefix}_precedence(int value) {
  int result = value;
  result += ++value;
  result += value++;
  result -= --value;
  result -= value--;
  return result;
}`,
  ];
  const body = [];
  body.push('int a = 7;');
  body.push('int b = 3;');
  body.push(`int c = ${mode + 5};`);
  body.push(`int arithmetic = ${prefix}_mix(a, b, c);`);
  body.push(`int logic = (a < b) && (c >= b) || !(a == c);`);
  body.push(`int bitwise = (a & c) ^ (b | c) ^ (~a);`);
  body.push(`int assignment = 1; assignment += a; assignment -= b; assignment *= 2; assignment /= 2; assignment %= 5;`);
  body.push(`assignment &= 7; assignment |= 2; assignment ^= 1; assignment <<= 1; assignment >>= 1;`);
  body.push(`int ternary = (a > b) ? a : (b > c ? b : c);`);
  body.push(`int comma = (assignment += 1, assignment += 2, assignment);`);
  body.push(`size_t size_type = sizeof(int) + sizeof a + sizeof(assignment + logic);`);
  body.push(`int array[3] = {1, 2, 3};`);
  body.push(`int *pointer = array;`);
  body.push(`int deref = *pointer++ + *pointer;`);
  body.push(`struct { int left; int right; } pair = { .left = a, .right = b };`);
  body.push(`int member = pair.left + pair.right;`);
  body.push(`int cast_chain = (int)(unsigned char)(short)(a + c);`);
  if (mode % 2 === 0) {
    body.push(`int precedence = ${prefix}_precedence(a + b * c - (a << 1));`);
    body.push(`int nested = a ? (b ? c : a) : (c ? b : a);`);
  } else {
    body.push(`int precedence = ${prefix}_precedence((a + b) * (c - 1));`);
    body.push(`int nested = (a ? b : c) ? (b ? c : a) : (c ? a : b);`);
  }
  body.push(`int final_value = arithmetic + logic + bitwise + assignment + ternary + comma + (int)size_type + deref + member + cast_chain + precedence + nested;`);
  body.push(`printf("ops:%d:%d:%zu\\n", final_value, ${prefix}_precedence(final_value), size_type);`);
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup3({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_walk(int value) {
  int total = 0;
  if (value < 0) {
    total = -value;
  } else if (value == 0) {
    total = 1;
  } else if (value < 3) {
    total = value + 3;
  } else {
    total = value * 2;
  }

  switch (value % 4) {
    case 0:
      total += 10;
      break;
    case 1:
      total += 20;
      /* fall through */
    case 2:
      total += 30;
      break;
    default:
      total += 40;
      break;
  }

  return total;
}`,
  ];
  const body = [];
  if (mode === 0) {
    body.push('int value = 0;');
    body.push('if (value == 0) { value = 1; }');
    body.push('if (value > 0) { if (value > 1) { value += 2; } }');
  } else if (mode === 1) {
    body.push('int value = 3;');
    body.push('switch (value) { case 0: value = 10; break; case 1: value = 20; break; case 2: value = 30; /* fall through */ default: value += 5; break; }');
  } else if (mode === 2) {
    body.push('int value = 0;');
    body.push('for (int i = 0, j = 5; i < 4 && j > 0; ++i, --j) { if (i == 2) { continue; } value += i + j; }');
  } else if (mode === 3) {
    body.push('int value = 0;');
    body.push('int counter = 0;');
    body.push('start_label:');
    body.push('while (counter < 3) { if (counter == 1) { ++counter; continue; } value += counter; ++counter; }');
    body.push('goto end_label;');
    body.push('mid_label: value += 10;');
    body.push('end_label: value += 20;');
    body.push('if (value < 0) goto start_label;');
  } else {
    body.push('int value = 0;');
    if (variant.code === 'struct') {
      body.push('#if defined(__GNUC__)');
      body.push('switch (2) { case 1 ... 10: value = 99; break; default: value = 77; break; }');
      body.push('#else');
      body.push('switch (2) { case 1: case 2: case 3: value = 99; break; default: value = 77; break; }');
      body.push('#endif');
    } else {
      body.push('for (;;) { value += 1; if (value > 2) { break; } }');
      body.push('while (1) { value += 2; if (value > 4) { break; } }');
    }
  }
  body.push(`int result = ${prefix}_walk(${mode + 1});`);
  body.push('printf("control:%d:%d\\n", value, result);');
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup4({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stdarg.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_sum_variadic(int count, ...) {
  int total = 0;
  va_list args;
  va_start(args, count);
  for (int index = 0; index < count; ++index) {
    total += va_arg(args, int);
  }
  va_end(args);
  return total;
}

static int ${prefix}_recursive(int value) {
  return value <= 1 ? 1 : value * ${prefix}_recursive(value - 1);
}

static int ${prefix}_mutual_b(int value);

static int ${prefix}_mutual_a(int value) {
  return value <= 0 ? 0 : value + ${prefix}_mutual_b(value - 1);
}

static int ${prefix}_mutual_b(int value) {
  return value <= 0 ? 0 : value + ${prefix}_mutual_a(value - 1);
}

static inline int ${prefix}_inline_add(int lhs, int rhs) {
  return lhs + rhs;
}

static int *${prefix}_return_pointer(int *value) {
  return value;
}

static struct ${prefix}_pair {
  int left;
  int right;
} ${prefix}_make_pair(int left, int right) {
  struct ${prefix}_pair pair = { left, right };
  return pair;
}`,
  ];

  if (mode === 4 && variant.code === 'name') {
    return renderSource({
      title,
      features,
      includes,
      blocks,
      mainSignature: 'int main(int argc, char **argv, char **envp)',
      mainBody: [
        '(void)argv;',
        '(void)envp;',
        'int values[] = {1, 2, 3, 4, 5};',
        'int (*callback)(int, int) = corpus_add;',
        'printf("envp:%d\\n", argc);',
        `printf("mix:%d\\n", ${prefix}_inline_add(argc, callback(values[2], values[3])));`,
        'return 0;',
      ],
      indent: variant.indent,
    });
  }

  const body = [];
  body.push('int seed = 4;');
  body.push(`int argc_like = ${mode + 2};`);
  body.push('int values[] = {1, 2, 3, 4, 5};');
  body.push('int (*callback)(int, int) = corpus_add;');
  if (mode === 0) {
    body.push('printf("fn:%d:%d\\n", callback(values[0], values[1]), seed);');
    body.push(`printf("proto:%d\\n", ${prefix}_inline_add(3, 4));`);
  } else if (mode === 1) {
    body.push(`printf("var:%d\\n", ${prefix}_sum_variadic(4, 1, 2, 3, 4));`);
    body.push('printf("callback:%d\\n", callback(7, 8));');
  } else if (mode === 2) {
    body.push(`printf("recur:%d:%d\\n", ${prefix}_recursive(5), ${prefix}_mutual_a(3));`);
  } else if (mode === 3) {
    body.push(`int value = 10;`);
    body.push(`int *ptr = ${prefix}_return_pointer(&value);`);
    body.push(`struct ${prefix}_pair pair = ${prefix}_make_pair(*ptr, seed);`);
    body.push('printf("pair:%d:%d\\n", pair.left, pair.right);');
  } else {
    body.push('int argc = argc_like;');
    body.push('printf("main:%d\\n", argc);');
  }
  body.push(`printf("mix:%d\\n", ${prefix}_inline_add(seed, callback(values[2], values[3])));`);
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup5({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '"corpus_shared.h"'];
  const blocks = [
    `#define ${prefix}_BASE 40
#define ${prefix}_STRINGIFY(name) CORPUS_STRINGIFY(name)
#define ${prefix}_PASTE(a, b) CORPUS_CAT(a, b)
#define ${prefix}_MULTI(x, y, z) ((x) + (y) + (z))

enum { ${prefix}_enum_value = ${prefix}_BASE + 2 };

#if 0
#error This branch is intentionally disabled for corpus coverage.
#endif

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wpedantic"

static int ${prefix}_expanded_value(void) {
  return ${prefix}_MULTI(1, 2, 3);
}

#pragma GCC diagnostic pop

#undef ${prefix}_BASE` ,
  ];
  const body = [];
  body.push('int value = 0;');
  body.push(`#if defined(__STDC__)`);
  body.push('value += __STDC__ ? 1 : 0;');
  body.push(`#endif`);
  body.push(`value += ${prefix}_enum_value;`);
  body.push(`value += ${prefix}_expanded_value();`);
  body.push(`printf("pp:%s:%s:%d\\n", ${prefix}_STRINGIFY(${prefix}_enum_value), CORPUS_STRINGIFY(__FILE__), value);`);
  if (mode === 0) {
    body.push('#ifdef CORPUS_SHARED_H');
    body.push('value += 1;');
    body.push('#endif');
  } else if (mode === 1) {
    body.push('#ifndef CORPUS_UNDEFINED_FLAG');
    body.push('value += 2;');
    body.push('#elif defined(CORPUS_OTHER_FLAG)');
    body.push('value += 3;');
    body.push('#else');
    body.push('value += 4;');
    body.push('#endif');
  } else if (mode === 2) {
    body.push('int local = 7;');
    body.push('#if defined(local)');
    body.push('value += local;');
    body.push('#else');
    body.push('value += 7;');
    body.push('#endif');
  } else if (mode === 3) {
    body.push('printf("date:%s time:%s line:%d\\n", __DATE__, __TIME__, __LINE__);');
    body.push('value += 5;');
  } else {
    body.push('int token = 12;');
    body.push('int CORPUS_PASTE(local_, token) = 8;');
    body.push('value += local_12;');
  }
  body.push('printf("pp-final:%d\\n", value);');
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup6({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stdlib.h>', '<string.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_sum_array(const int *values, size_t count) {
  int total = 0;
  for (const int *cursor = values; cursor < values + count; ++cursor) {
    total += *cursor;
  }
  return total;
}

static void ${prefix}_fill_strings(char *buffer, size_t capacity) {
  snprintf(buffer, capacity, "%s", "corpus");
}

static int ${prefix}_callers(int (*fn[2])(int, int), int lhs, int rhs) {
  return fn[0](lhs, rhs) + fn[1](lhs, rhs);
}`,
  ];
  const body = [];
  body.push('int numbers[] = {1, 2, 3, 4, 5};');
  body.push('int *pointer = numbers;');
  body.push('int *end = numbers + 5;');
  body.push('int pointer_sum = 0;');
  body.push('for (; pointer < end; ++pointer) { pointer_sum += *pointer; }');
  body.push('char text[32];');
  body.push(`void *memory = malloc(4 * sizeof(int));`);
  body.push('int *ints = (int *)memory;');
  body.push('for (int i = 0; i < 4; ++i) { ints[i] = i + 1; }');
  body.push('memory = realloc(memory, 8 * sizeof(int));');
  body.push('ints = (int *)memory;');
  body.push('for (int i = 4; i < 8; ++i) { ints[i] = i + 1; }');
  body.push('int *grid_rows[2];');
  body.push('grid_rows[0] = calloc(3, sizeof(int));');
  body.push('grid_rows[1] = calloc(3, sizeof(int));');
  body.push('grid_rows[0][0] = 6; grid_rows[0][1] = 7; grid_rows[0][2] = 8;');
  body.push('grid_rows[1][0] = 9; grid_rows[1][1] = 10; grid_rows[1][2] = 11;');
  body.push('int (*function_table[2])(int, int) = { corpus_add, corpus_mul };');
  body.push('const char *const source = "strings";');
  body.push('char *mutable_string = text;');
  body.push('strcpy(mutable_string, source);');
  body.push('strcat(mutable_string, "-ok");');
  body.push('const char *search = strchr(mutable_string, "o"[0]);');
  body.push('const char *reverse = strrchr(mutable_string, "o"[0]);');
  body.push('int **matrix = grid_rows;');
  body.push('int alias_left = numbers[0];');
  body.push('int alias_right = numbers[4];');
  if (mode === 0) {
    body.push(`int result = ${prefix}_sum_array(numbers, 5);`);
  } else if (mode === 1) {
    body.push(`int result = ${prefix}_callers(function_table, 2, 3);`);
  } else if (mode === 2) {
    body.push('const char *walker = mutable_string;');
    body.push('while (*walker) { ++walker; }');
    body.push('int result = (int)(walker - mutable_string);');
  } else if (mode === 3) {
    body.push('int result = matrix[0][1] + matrix[1][2];');
  } else {
    body.push('int result = alias_left + alias_right + (search != NULL) + (reverse != NULL);');
    body.push('free(memory);');
    body.push('memory = NULL;');
    body.push('if (memory == NULL) { result += 1; }');
  }
  if (mode !== 4) {
    body.push('free(memory);');
  }
  body.push('free(grid_rows[0]);');
  body.push('free(grid_rows[1]);');
  body.push('printf("ptr:%d:%s\\n", result + pointer_sum, mutable_string);');
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup7({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stdlib.h>', '<stddef.h>', '"corpus_shared.h"'];
  const blocks = [
    `typedef struct ${prefix}_node {
  int value;
  struct ${prefix}_node *next;
} ${prefix}_node;

typedef struct ${prefix}_tree {
  int value;
  struct ${prefix}_tree *left;
  struct ${prefix}_tree *right;
} ${prefix}_tree;

typedef union ${prefix}_punned {
  unsigned int u;
  float f;
} ${prefix}_punned;

typedef struct ${prefix}_flex {
  size_t length;
  int data[];
} ${prefix}_flex;

typedef struct ${prefix}_opaque ${prefix}_opaque;

struct ${prefix}_opaque {
  int hidden;
};

static ${prefix}_node *${prefix}_push(${prefix}_node *head, int value) {
  ${prefix}_node *node = malloc(sizeof(*node));
  node->value = value;
  node->next = head;
  return node;
}

static int ${prefix}_list_sum(const ${prefix}_node *head) {
  int total = 0;
  for (; head != NULL; head = head->next) {
    total += head->value;
  }
  return total;
}

static int ${prefix}_tree_sum(const ${prefix}_tree *root) {
  if (root == NULL) {
    return 0;
  }
  return root->value + ${prefix}_tree_sum(root->left) + ${prefix}_tree_sum(root->right);
}

static int ${prefix}_opaque_value(const ${prefix}_opaque *value) {
  return value->hidden;
}`,
  ];
  const body = [];
  if (mode === 0) {
    body.push(`${prefix}_node *head = NULL;`);
    body.push(`head = ${prefix}_push(head, 1);`);
    body.push(`head = ${prefix}_push(head, 2);`);
    body.push(`head = ${prefix}_push(head, 3);`);
    body.push(`printf("list:%d\\n", ${prefix}_list_sum(head));`);
    body.push(`while (head != NULL) { ${prefix}_node *next = head->next; free(head); head = next; }`);
  } else if (mode === 1) {
    body.push(`${prefix}_tree root = { 5, NULL, NULL };`);
    body.push(`${prefix}_tree left = { 2, NULL, NULL };`);
    body.push(`${prefix}_tree right = { 8, NULL, NULL };`);
    body.push('root.left = &left; root.right = &right;');
    body.push(`printf("tree:%d\\n", ${prefix}_tree_sum(&root));`);
  } else if (mode === 2) {
    body.push('size_t slots = 8;');
    body.push(`${prefix}_node **table = calloc(slots, sizeof(*table));`);
    body.push('for (size_t i = 0; i < slots; ++i) { table[i] = NULL; }');
    body.push('int result = 0;');
    body.push('for (size_t i = 0; i < slots; ++i) { result += (int)i; }');
    body.push('free(table);');
    body.push('printf("hash:%d\\n", result);');
  } else if (mode === 3) {
    body.push(`${prefix}_punned punned = { .u = 0x3f800000u };`);
    body.push(`${prefix}_opaque opaque = { .hidden = 17 };`);
    body.push('struct copy_holder { int value; int other; } left = { 1, 2 }, right = { 0, 0 };');
    body.push('right = left;');
    body.push(`printf("pun:%f:%d:%d\\n", punned.f, ${prefix}_opaque_value(&opaque), right.value + right.other);`);
  } else {
    body.push('#pragma pack(push, 1)');
    body.push(`struct ${prefix}_packed { char tag; int value; };`);
    body.push('#pragma pack(pop)');
    body.push(`struct ${prefix}_packed packed = { 'A', 99 };`);
    body.push(`${prefix}_flex *flex = malloc(sizeof(*flex) + 3 * sizeof(int));`);
    body.push('flex->length = 3; flex->data[0] = 4; flex->data[1] = 5; flex->data[2] = 6;');
    body.push(`printf("pack:%zu:%zu:%d\\n", sizeof(packed), offsetof(struct ${prefix}_packed, value), flex->data[2]);`);
    body.push('free(flex);');
    if (variant.code === 'name') {
      body.push('#if defined(__GNUC__)');
      body.push('struct { int a; union { int b; long c; }; } anon = { .a = 1, .b = 2 };');
      body.push('printf("anon:%d:%d\\n", anon.a, anon.b);');
      body.push('#endif');
    }
  }
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup8({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '<stdlib.h>', '<string.h>', '<ctype.h>', '<math.h>', '<time.h>', '<assert.h>', '<setjmp.h>', '<signal.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_compare_ints(const void *lhs, const void *rhs) {
  int left = *(const int *)lhs;
  int right = *(const int *)rhs;
  return (left > right) - (left < right);
}

static int ${prefix}_bsearch_target(const void *element, const void *key) {
  return ${prefix}_compare_ints(element, key);
}

static jmp_buf ${prefix}_jump;

static void ${prefix}_signal_handler(int signum) {
  printf("signal:%d\\n", signum);
  longjmp(${prefix}_jump, 1);
}`,
  ];
  const body = [];
  if (mode === 0) {
    body.push('FILE *handle = tmpfile();');
    body.push('fputs("hello\\n", handle);');
    body.push('rewind(handle);');
    body.push('char buffer[32];');
    body.push('fgets(buffer, sizeof buffer, handle);');
    body.push('printf("stdio:%s", buffer);');
    body.push('fclose(handle);');
  } else if (mode === 1) {
    body.push('int values[] = {5, 2, 9, 1};');
    body.push('srand(1);');
    body.push(`qsort(values, 4, sizeof(int), ${prefix}_compare_ints);`);
    body.push('int key = 5;');
    body.push(`int *match = bsearch(&key, values, 4, sizeof(int), ${prefix}_compare_ints);`);
    body.push('printf("stdlib:%d:%d:%d\\n", atoi("12"), (int)strtol("15", NULL, 10), match != NULL);');
  } else if (mode === 2) {
    body.push('char text[] = "Abc 123";');
    body.push('size_t alpha = 0;');
    body.push('for (size_t index = 0; text[index] != 0; ++index) { alpha += isalpha((unsigned char)text[index]) ? 1u : 0u; text[index] = (char)toupper((unsigned char)text[index]); }');
    body.push('printf("ctype:%zu:%s\\n", alpha, text);');
  } else if (mode === 3) {
    body.push('double root = sqrt(16.0);');
    body.push('double trig = sin(0.0) + cos(0.0) + tan(0.0);');
    body.push('double power = pow(2.0, 3.0);');
    body.push('time_t now = time(NULL);');
    body.push('struct tm *stamp = localtime(&now);');
    body.push('char time_buffer[64];');
    body.push('strftime(time_buffer, sizeof time_buffer, "%Y-%m-%d", stamp);');
    body.push('printf("math:%0.1f:%0.1f:%s\\n", root + trig + power, fabs(-3.5), time_buffer);');
  } else {
    body.push('assert(1);');
    body.push(`if (setjmp(${prefix}_jump) == 0) { signal(SIGINT, ${prefix}_signal_handler); raise(SIGINT); }`);
    body.push('#ifdef _OPENMP');
    body.push('printf("openmp:%d\\n", omp_get_max_threads());');
    body.push('#else');
    body.push('printf("openmp:disabled\\n");');
    body.push('#endif');
  }
  body.push('printf("std:%s:%d\\n", __FILE__, __STDC__);');
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function buildGroup9({ prefix, mode, title, features, variant }) {
  const includes = ['<stdio.h>', '"corpus_shared.h"'];
  const blocks = [
    `static int ${prefix}_next(int value) {
  return value + 1;
}

static int ${prefix}_square(int value) {
  return value * value;
}

static int ${prefix}_chain(int a, int b, int c) {
  return a + b + c;
}`,
  ];
  const body = [];
  body.push('int x = 1;');
  body.push('int y = 2;');
  body.push('int z = 3;');
  if (mode === 0) {
    body.push('int result = x ? (y ? z : x) : (z ? y : x);');
    body.push(`int result = values[${prefix}_next(0)] + values[${prefix}_next(1)];`);
  } else if (mode === 1) {
    body.push('int result = (int)(unsigned)(char *)&x == (int)(long)&y ? 1 : 0;');
    body.push('result += (x++ + ++y + z-- + --x);');
  } else if (mode === 2) {
    body.push(`int result = ${prefix}_chain(${prefix}_next(x), ${prefix}_square(y), ${prefix}_next(${prefix}_square(z)));`);
    body.push('result += sizeof(result + x * y - z);');
  } else if (mode === 3) {
    body.push('int values[3] = {1, 2, 3};');
    body.push(`int result = values[${prefix}_next(0)] + values[${prefix}_next(1)];`);
    body.push('result += (values[0] > 0 ? values[1] : values[2]);');
  } else {
    body.push('struct holder { int value; int other; } sample = { 4, 5 };');
    body.push('struct holder *ptr = &sample;');
    body.push('int result = ptr->value + (*ptr).other + sizeof(*(ptr)) + sizeof((int[]){1, 2, 3});');
    body.push('result += ((result > 0) ? result : -result);');
  }
  body.push('printf("expr:%d\\n", result);');
  body.push('return 0;');

  return renderSource({ title, features, includes, blocks, mainBody: body, indent: variant.indent });
}

function variantNotes(groupTitle, mode) {
  const suffix = mode === 0 ? ' core coverage' : mode === 1 ? ' alternate syntax path' : mode === 2 ? ' control-flow variation' : mode === 3 ? ' formatting / identifier variation' : ' extension coverage';
  return `${groupTitle}${suffix}`;
}

function generate() {
  ensureDir(ROOT);
  writeText(SHARED_HEADER, sharedHeader());

  const manifestRows = ['variant,group,file,relative_path,features,lines,notes'];

  for (const group of GROUPS) {
    for (let index = 1; index <= group.count; index += 1) {
      const mode = (index - 1) % group.modes;
      for (const variant of VARIANTS) {
        const prefix = groupPrefix(group.number, index, variant);
        const source = group.build({
          prefix,
          mode,
          title: group.title,
          features: group.features,
          variant,
        });
        const filename = `g${pad2(group.number)}_${pad2(index)}_${variant.name}.c`;
        const filePath = path.join(ROOT, filename);
        writeText(filePath, source);
        const lineCount = source.split(/\r?\n/).length;
        manifestRows.push([
          csvEscape(variant.name),
          csvEscape(group.title),
          csvEscape(filename),
          csvEscape(filename),
          csvEscape(group.features.join(' | ')),
          csvEscape(lineCount),
          csvEscape(variantNotes(group.title, mode)),
        ].join(','));
      }
    }
  }

  writeText(path.join(ROOT, 'manifest.csv'), manifestRows.join('\n'));
  console.log(`Generated ${manifestRows.length - 1} files plus shared header and manifest at ${ROOT}`);
}

generate();