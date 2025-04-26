#include "cppf/ContactBook.hpp"

#include <ostream>
#include <stdexcept>

namespace cppf
{

ContactBook::ContactBook() : contacts_(), size_(0), next_(0)
{
}

void ContactBook::add(const Contact &contact)
{
    Contact replacement;

    if (contact.empty())
        return;
    replacement = contact;
    contacts_[next_].swap(replacement);
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

void ContactBook::write(std::ostream &output) const
{
    std::size_t index;

    for (index = 0; index < size_; ++index)
    {
        const Contact &contact = at(index);
        output << index << '|' << contact.name() << '|' << contact.note()
               << '\n';
    }
}

}
