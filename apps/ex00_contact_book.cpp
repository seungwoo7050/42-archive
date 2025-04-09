#include "cppf/Contact.hpp"
#include "cppf/ContactBook.hpp"

#include <iostream>
#include <string>

namespace
{

bool addContact(cppf::ContactBook &book, const std::string &payload)
{
    const std::string::size_type separator = payload.find('|');
    cppf::Contact contact;

    if (separator == std::string::npos)
        return false;
    contact = cppf::Contact(payload.substr(0, separator),
                            payload.substr(separator + 1));
    if (contact.empty())
        return false;
    book.add(contact);
    return true;
}

}

int main()
{
    cppf::ContactBook book;
    std::string line;

    while (std::getline(std::cin, line))
    {
        if (line.compare(0, 4, "ADD ") == 0)
            std::cout << (addContact(book, line.substr(4)) ? "ok\n" : "error\n");
        else if (line == "LIST")
            book.write(std::cout);
        else if (line == "QUIT")
            return 0;
        else
            std::cout << "error\n";
    }
    return 0;
}
