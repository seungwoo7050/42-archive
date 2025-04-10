#include "cppf/TextBuffer.hpp"
#include "support/FailingNew.hpp"

#include <cstring>
#include <iostream>
#include <new>

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

void testConstructionFailure()
{
    const std::size_t baseline = failing_new::liveBlocks();
    bool threw = false;

    failing_new::failOn(1);
    try
    {
        cppf::TextBuffer value("value");
    }
    catch (const std::bad_alloc &)
    {
        threw = true;
    }
    failing_new::disableFailure();
    check(threw);
    check(failing_new::liveBlocks() == baseline);
}

void testCopyAndAssignmentFailure()
{
    cppf::TextBuffer source("source");
    cppf::TextBuffer destination("destination");
    const cppf::TextBuffer &self_alias = source;
    const std::size_t baseline = failing_new::liveBlocks();
    bool threw = false;

    failing_new::failOn(1);
    try
    {
        cppf::TextBuffer copy(source);
    }
    catch (const std::bad_alloc &)
    {
        threw = true;
    }
    failing_new::disableFailure();
    check(threw);
    check(std::strcmp(source.c_str(), "source") == 0);
    check(failing_new::liveBlocks() == baseline);

    threw = false;
    failing_new::failOn(1);
    try
    {
        destination = source;
    }
    catch (const std::bad_alloc &)
    {
        threw = true;
    }
    failing_new::disableFailure();
    check(threw);
    check(std::strcmp(destination.c_str(), "destination") == 0);
    check(failing_new::liveBlocks() == baseline);

    threw = false;
    failing_new::failOn(1);
    try
    {
        source = self_alias;
    }
    catch (const std::bad_alloc &)
    {
        threw = true;
    }
    failing_new::disableFailure();
    check(threw);
    check(std::strcmp(source.c_str(), "source") == 0);
    check(failing_new::liveBlocks() == baseline);
}

void testCompositionFailureSweep()
{
    cppf::TextBuffer left("left");
    const cppf::TextBuffer right("right");
    std::size_t observed;
    std::size_t index;

    failing_new::resetAttempts();
    {
        const cppf::TextBuffer joined = left + right;
        check(std::strcmp(joined.c_str(), "leftright") == 0);
    }
    observed = failing_new::attempts();
    check(observed != 0);
    for (index = 1; index <= observed; ++index)
    {
        const std::size_t baseline = failing_new::liveBlocks();
        bool threw = false;

        failing_new::failOn(index);
        try
        {
            const cppf::TextBuffer joined = left + right;
        }
        catch (const std::bad_alloc &)
        {
            threw = true;
        }
        failing_new::disableFailure();
        check(threw);
        check(std::strcmp(left.c_str(), "left") == 0);
        check(std::strcmp(right.c_str(), "right") == 0);
        check(failing_new::liveBlocks() == baseline);
    }

    {
        const std::size_t baseline = failing_new::liveBlocks();
        bool threw = false;

        failing_new::failOn(1);
        try
        {
            left += right;
        }
        catch (const std::bad_alloc &)
        {
            threw = true;
        }
        failing_new::disableFailure();
        check(threw);
        check(std::strcmp(left.c_str(), "left") == 0);
        check(failing_new::liveBlocks() == baseline);
    }
}

}

int main()
{
    testConstructionFailure();
    testCopyAndAssignmentFailure();
    testCompositionFailureSweep();
    if (failures != 0)
        return 1;
    std::cout << checks << " failure checks passed" << std::endl;
    return 0;
}
