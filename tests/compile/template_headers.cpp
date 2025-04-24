#include "cppf/RandomAccessBatch.hpp"
#include "cppf/RandomAccessBatch.hpp"

#include <deque>

bool lessInt(int left, int right)
{
    return left < right;
}

int main()
{
    cppf::RandomAccessBatch<int> vector_values;
    cppf::RandomAccessBatch<int, std::deque<int> > deque_values;

    vector_values.push_back(2);
    vector_values.push_back(1);
    deque_values.push_back(2);
    deque_values.push_back(1);
    vector_values.sort(lessInt);
    deque_values.sort(lessInt);
    const cppf::RandomAccessBatch<int> &vector_view = vector_values;
    const cppf::RandomAccessBatch<int, std::deque<int> > &deque_view =
        deque_values;
    return !cppf::equal_ranges(vector_view.begin(), vector_view.end(),
                               deque_view.begin(), deque_view.end());
}
