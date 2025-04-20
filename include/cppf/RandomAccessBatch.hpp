#ifndef CPPF_RANDOM_ACCESS_BATCH_HPP
#define CPPF_RANDOM_ACCESS_BATCH_HPP

#include <algorithm>
#include <cstddef>
#include <stdexcept>
#include <vector>

namespace cppf
{

template <class T, class Container = std::vector<T> >
class RandomAccessBatch
{
public:
    typedef typename Container::iterator iterator;
    typedef typename Container::const_iterator const_iterator;

    RandomAccessBatch() : values_()
    {
    }

    RandomAccessBatch(const RandomAccessBatch &other)
        : values_(other.values_)
    {
    }

    RandomAccessBatch &operator=(const RandomAccessBatch &other)
    {
        if (this != &other)
        {
            RandomAccessBatch copy(other);

            swap(copy);
        }
        return *this;
    }

    void push_back(const T &value)
    {
        values_.push_back(value);
    }

    std::size_t size() const
    {
        return static_cast<std::size_t>(values_.size());
    }

    bool empty() const
    {
        return values_.empty();
    }

    T &at(std::size_t index)
    {
        if (index >= values_.size())
            throw std::out_of_range("batch index");
        return values_[index];
    }

    const T &at(std::size_t index) const
    {
        if (index >= values_.size())
            throw std::out_of_range("batch index");
        return values_[index];
    }

    iterator begin()
    {
        return values_.begin();
    }

    iterator end()
    {
        return values_.end();
    }

    const_iterator begin() const
    {
        return values_.begin();
    }

    const_iterator end() const
    {
        return values_.end();
    }

    template <class Compare>
    void sort(Compare compare)
    {
        std::sort(values_.begin(), values_.end(), compare);
    }

    void swap(RandomAccessBatch &other)
    {
        values_.swap(other.values_);
    }

private:
    Container values_;
};

template <class FirstIterator, class SecondIterator>
bool equal_ranges(FirstIterator first,
                  FirstIterator last,
                  SecondIterator second,
                  SecondIterator second_last)
{
    while (first != last && second != second_last)
    {
        if (!(*first == *second))
            return false;
        ++first;
        ++second;
    }
    return first == last && second == second_last;
}

}

#endif
