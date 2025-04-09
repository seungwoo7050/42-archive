#include "cppf/ContactBook.hpp"
#include "support/Test.hpp"

#include <sstream>
#include <stdexcept>

void testContactBook(test_support::Suite &suite)
{
    cppf::ContactBook book;
    const char *names[] = {
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
    };
    std::size_t index;
    bool threw;
    std::ostringstream output;

    suite.check(book.size() == 0, "contact book starts empty");
    book.add(cppf::Contact());
    suite.check(book.size() == 0, "contact book ignores empty values");
    for (index = 0; index < 10; ++index)
        book.add(cppf::Contact(names[index], "note"));
    suite.check(book.size() == cppf::ContactBook::capacity,
                "contact book keeps bounded size");
    suite.check(book.at(0).name() == "C", "contact book replaces oldest");
    suite.check(book.at(7).name() == "J", "contact book keeps newest");
    suite.check(book.at(3).name() == "F", "contact book maps logical order");
    suite.check(book.at(0).name() != "A", "contact book discards first value");
    suite.check(book.at(0).name() != "B", "contact book discards second value");
    book.write(output);
    suite.check(output.str() ==
                    "0|C|note\n1|D|note\n2|E|note\n3|F|note\n"
                    "4|G|note\n5|H|note\n6|I|note\n7|J|note\n",
                "contact book writes logical order");

    threw = false;
    try
    {
        book.at(book.size());
    }
    catch (const std::out_of_range &)
    {
        threw = true;
    }
    suite.check(threw, "contact book rejects invalid index");
}
