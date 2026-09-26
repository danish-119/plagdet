#include <stdint.h>
#include <stddef.h>

uint32_t rolling_hash(const char* input, int length, uint32_t seed) {
    uint32_t hash = 2166136261u ^ seed;
    for (int index = 0; index < length; ++index) {
        hash ^= (unsigned char)input[index];
        hash *= 16777619u;
    }
    return hash;
}
