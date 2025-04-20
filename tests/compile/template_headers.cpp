#include "cppf/RandomAccessBatch.hpp"
#include "cppf/RandomAccessBatch.hpp"

#include <deque>

bool lessInt(int left, int right)
{
    return left < right;
}

int main()
{
    cppf::RandomAccessBatch<int, std::deque<int> > values;

    values.push_back(2);
    values.push_back(1);
    values.sort(lessInt);
    return values.at(0) != 1;
}
