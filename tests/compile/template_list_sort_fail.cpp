#include "cppf/RandomAccessBatch.hpp"

#include <list>

bool lessInt(int left, int right)
{
    return left < right;
}

int main()
{
    cppf::RandomAccessBatch<int, std::list<int> > values;

    values.push_back(2);
    values.push_back(1);
    values.sort(lessInt);
    return 0;
}
