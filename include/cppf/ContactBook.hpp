#ifndef CPPF_CONTACT_BOOK_HPP
#define CPPF_CONTACT_BOOK_HPP

#include "cppf/Contact.hpp"

#include <cstddef>
#include <iosfwd>

namespace cppf
{

class ContactBook
{
public:
    enum
    {
        capacity = 8
    };

    ContactBook();

    void add(const Contact &contact);
    std::size_t size() const;
    const Contact &at(std::size_t logical_index) const;
    void write(std::ostream &output) const;

private:
    Contact contacts_[capacity];
    std::size_t size_;
    std::size_t next_;
};

}

#endif
