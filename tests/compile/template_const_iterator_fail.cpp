#include "cppf/RandomAccessBatch.hpp"

int main()
{
    const cppf::RandomAccessBatch<int> values;

    *values.begin() = 1;
    return 0;
}
