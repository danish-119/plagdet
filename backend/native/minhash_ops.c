#include <stdint.h>

static uint32_t mix(uint32_t value, uint32_t seed) {
    uint32_t x = value ^ seed;
    x ^= x >> 16;
    x *= 0x7feb352du;
    x ^= x >> 15;
    x *= 0x846ca68bu;
    x ^= x >> 16;
    return x;
}

void minhash_batch(uint32_t* shingles, int shingle_count, int num_hashes, uint32_t* output) {
    for (int hash_index = 0; hash_index < num_hashes; ++hash_index) {
        uint32_t seed = 0x9e3779b9u * (uint32_t)(hash_index + 1);
        uint32_t minimum = 0xffffffffu;
        for (int shingle_index = 0; shingle_index < shingle_count; ++shingle_index) {
            uint32_t candidate = mix(shingles[shingle_index], seed);
            if (candidate < minimum) {
                minimum = candidate;
            }
        }
        output[hash_index] = minimum;
    }
}
