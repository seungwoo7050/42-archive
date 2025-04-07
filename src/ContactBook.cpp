#include "cppf/ContactBook.hpp"

#include <stdexcept>

namespace cppf
{

ContactBook::ContactBook() : contacts_(), size_(0), next_(0)
{
}

void ContactBook::add(const Contact &contact)
{
    if (contact.empty())
        return;
    contacts_[next_] = contact;
    next_ = (next_ + 1) % capacity;
    if (size_ < capacity)
        ++size_;
}

std::size_t ContactBook::size() const
{
    return size_;
}

const Contact &ContactBook::at(std::size_t logical_index) const
{
    std::size_t first;

    if (logical_index >= size_)
        throw std::out_of_range("contact index");
    first = size_ == capacity ? next_ : 0;
    return contacts_[(first + logical_index) % capacity];
}

}
