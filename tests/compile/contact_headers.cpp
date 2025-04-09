#include "cppf/Contact.hpp"
#include "cppf/Contact.hpp"
#include "cppf/ContactBook.hpp"
#include "cppf/ContactBook.hpp"

#include <sstream>

int main()
{
    cppf::ContactBook book;
    const cppf::Contact contact("Ada", "math");
    std::ostringstream output;

    book.add(contact);
    book.write(output);
    return book.at(0).name() == "Ada" ? 0 : 1;
}
