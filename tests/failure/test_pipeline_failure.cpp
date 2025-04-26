#include "cppf/FormatPipeline.hpp"
#include "support/TestFormatter.hpp"

#include <cstring>
#include <iostream>

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

void appendSteps(cppf::FormatPipeline &pipeline,
                 const test_support::TestFormatter &formatter,
                 std::size_t count)
{
    std::size_t index;

    for (index = 0; index < count; ++index)
        pipeline.append(formatter);
}

void checkCopyConstructionFailures(const cppf::FormatPipeline &source,
                                   std::size_t clone_count)
{
    std::size_t failure_index;

    for (failure_index = 1; failure_index <= clone_count; ++failure_index)
    {
        const int live_before = test_support::TestFormatter::liveCount();
        bool clone_failure = false;
        bool unexpected_exception = false;

        test_support::TestFormatter::failCloneOn(failure_index);
        try
        {
            const cppf::FormatPipeline copy(source);
        }
        catch (const test_support::CloneFailure &)
        {
            clone_failure = true;
        }
        catch (...)
        {
            unexpected_exception = true;
        }
        test_support::TestFormatter::disableCloneFailure();

        check(clone_failure);
        check(!unexpected_exception);
        check(test_support::TestFormatter::cloneAttempts() == failure_index);
        check(test_support::TestFormatter::liveCount() == live_before);
        check(source.size() == clone_count);
        check(std::strcmp(source.apply(cppf::TextBuffer("value")).c_str(),
                          ">>>>value") == 0);
    }
}

void checkAssignmentFailures(const cppf::FormatPipeline &source,
                             const test_support::TestFormatter &replacement,
                             std::size_t clone_count)
{
    std::size_t failure_index;

    for (failure_index = 1; failure_index <= clone_count; ++failure_index)
    {
        cppf::FormatPipeline target;
        bool clone_failure = false;
        bool unexpected_exception = false;

        target.append(replacement);
        const int live_before = test_support::TestFormatter::liveCount();
        test_support::TestFormatter::failCloneOn(failure_index);
        try
        {
            target = source;
        }
        catch (const test_support::CloneFailure &)
        {
            clone_failure = true;
        }
        catch (...)
        {
            unexpected_exception = true;
        }
        test_support::TestFormatter::disableCloneFailure();

        check(clone_failure);
        check(!unexpected_exception);
        check(test_support::TestFormatter::cloneAttempts() == failure_index);
        check(test_support::TestFormatter::liveCount() == live_before);
        check(target.size() == 1);
        check(std::strcmp(target.apply(cppf::TextBuffer("value")).c_str(),
                          "!value") == 0);
    }
}

void testCloneFailureSweep()
{
    const std::size_t step_count = 4;
    const int outer_baseline = test_support::TestFormatter::liveCount();

    {
        const test_support::TestFormatter step(cppf::TextBuffer(">"));
        const test_support::TestFormatter replacement(cppf::TextBuffer("!"));
        cppf::FormatPipeline source;

        appendSteps(source, step, step_count);
        check(source.size() == step_count);
        checkCopyConstructionFailures(source, step_count);
        checkAssignmentFailures(source, replacement, step_count);
    }
    check(test_support::TestFormatter::liveCount() == outer_baseline);
}

}

int main()
{
    testCloneFailureSweep();
    if (failures != 0)
        return 1;
    std::cout << checks << " pipeline failure checks passed" << std::endl;
    return 0;
}
