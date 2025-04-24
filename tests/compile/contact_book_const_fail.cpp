#include "cppf/ContactBook.hpp"

int main()
{
    cppf::ContactBook book;
    cppf::Contact replacement("Grace", "ownership");

    book.add(cppf::Contact("Ada", "objects"));
    book.at(0).swap(replacement);
    return 0;
}
