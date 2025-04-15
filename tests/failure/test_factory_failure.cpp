#include "cppf/Factory.hpp"
#include "support/FailingNew.hpp"

#include <cstring>
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

void testAllocationFailureSweep()
{
    const cppf::DefaultFormatterCreator creator;
    const cppf::UppercaseFormatter seed;
    const std::string specifications[] = {
        "prefix=abcdefghijklmnopqrstuvwxyz0123456789",
        "upper",
        "suffix=ABCDEFGHIJKLMNOPQRSTUVWXYZ9876543210"};
    const std::size_t outer_baseline = failing_new::liveBlocks();
    std::size_t observed = 0;
    std::size_t index;

    {
        cppf::FormatPipeline target;

        target.append(seed);
        failing_new::resetAttempts();
        cppf::PipelineBuilder::replace(target, creator, specifications, 3);
        observed = failing_new::attempts();
        check(target.size() == 3);
    }
    check(observed != 0);
    check(failing_new::liveBlocks() == outer_baseline);

    for (index = 1; index <= observed; ++index)
    {
        cppf::FormatPipeline target;
        bool bad_allocation = false;
        bool unexpected_exception = false;
        std::size_t reached_attempt;
        std::size_t baseline;

        target.append(seed);
        baseline = failing_new::liveBlocks();
        failing_new::failOn(index);
        try
        {
            cppf::PipelineBuilder::replace(
                target, creator, specifications, 3);
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
        reached_attempt = failing_new::attempts();

        check(bad_allocation);
        check(!unexpected_exception);
        check(reached_attempt == index);
        check(target.size() == 1);
        check(std::strcmp(
                  target.apply(cppf::TextBuffer("keep")).c_str(),
                  "KEEP") == 0);
        check(failing_new::liveBlocks() == baseline);
    }
    check(failing_new::liveBlocks() == outer_baseline);
}

}

int main()
{
    testAllocationFailureSweep();
    if (failures != 0)
        return 1;
    std::cout << checks << " factory failure checks passed" << std::endl;
    return 0;
}
