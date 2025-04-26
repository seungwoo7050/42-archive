#include "cppf/ContactBook.hpp"
#include "support/FailingNew.hpp"

#include <iostream>
#include <new>
#include <string>

namespace
{

unsigned int checks = 0;
unsigned int failures = 0;

void check(bool condition)
{
    ++checks;
    if (!condition)
        ++failures;
}

void seed(cppf::ContactBook &book)
{
    const char *names[] = {
        "one", "two", "three", "four", "five", "six", "seven", "eight"};
    std::size_t index;

    for (index = 0; index < cppf::ContactBook::capacity; ++index)
        book.add(cppf::Contact(names[index], "seed"));
}

void checkSeed(const cppf::ContactBook &book)
{
    const char *names[] = {
        "one", "two", "three", "four", "five", "six", "seven", "eight"};
    std::size_t index;

    check(book.size() == cppf::ContactBook::capacity);
    for (index = 0; index < cppf::ContactBook::capacity; ++index)
    {
        check(book.at(index).name() == names[index]);
        check(book.at(index).note() == "seed");
    }
}

std::size_t successfulAddAllocationCount(const cppf::Contact &replacement)
{
    cppf::ContactBook book;

    seed(book);
    failing_new::resetAttempts();
    book.add(replacement);
    return failing_new::attempts();
}

void testAddFailureSweep()
{
    const std::string long_name(32, 'n');
    const std::string long_note(64, 'x');
    const cppf::Contact replacement(long_name, long_note);
    const std::size_t allocation_count =
        successfulAddAllocationCount(replacement);
    const std::size_t outer_baseline = failing_new::liveBlocks();
    std::size_t failure_index;

    check(allocation_count >= 2);
    for (failure_index = 1; failure_index <= allocation_count;
         ++failure_index)
    {
        cppf::ContactBook book;
        bool bad_allocation = false;
        bool unexpected_exception = false;

        seed(book);
        const std::size_t baseline = failing_new::liveBlocks();
        failing_new::failOn(failure_index);
        try
        {
            book.add(replacement);
        }
        catch (const std::bad_alloc &)
        {
            bad_allocation = true;
        }
        catch (...)
        {
            unexpected_exception = true;
        }
        failing_new::disableFailure();

        check(bad_allocation);
        check(!unexpected_exception);
        check(failing_new::attempts() == failure_index);
        check(failing_new::liveBlocks() == baseline);
        checkSeed(book);

        book.add(replacement);
        check(book.size() == cppf::ContactBook::capacity);
        check(book.at(0).name() == "two");
        check(book.at(cppf::ContactBook::capacity - 1).name() == long_name);
        check(book.at(cppf::ContactBook::capacity - 1).note() == long_note);
    }
    check(failing_new::liveBlocks() == outer_baseline);
}

}

int main()
{
    testAddFailureSweep();
    if (failures != 0)
    {
        std::cerr << failures << " contact failure checks failed" << std::endl;
        return 1;
    }
    std::cout << checks << " contact failure checks passed" << std::endl;
    return 0;
}
