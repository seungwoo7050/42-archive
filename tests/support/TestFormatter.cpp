#include "support/TestFormatter.hpp"

namespace test_support
{

int TestFormatter::live_count_ = 0;
int TestFormatter::destroyed_count_ = 0;
std::size_t TestFormatter::clone_attempts_ = 0;
std::size_t TestFormatter::clone_failure_attempt_ = 0;

TestFormatter::TestFormatter(const cppf::TextBuffer &prefix) : prefix_(prefix)
{
    ++live_count_;
}

TestFormatter::TestFormatter(const TestFormatter &other)
    : cppf::Formatter(other), prefix_(other.prefix_)
{
    ++live_count_;
}

TestFormatter::~TestFormatter()
{
    --live_count_;
    ++destroyed_count_;
}

cppf::Formatter *TestFormatter::clone() const
{
    ++clone_attempts_;
    if (clone_failure_attempt_ != 0 &&
        clone_attempts_ == clone_failure_attempt_)
        throw CloneFailure();
    return new TestFormatter(*this);
}

cppf::TextBuffer TestFormatter::apply(const cppf::TextBuffer &input) const
{
    return prefix_ + input;
}

const char *TestFormatter::name() const
{
    return "test";
}

void TestFormatter::resetCounters()
{
    live_count_ = 0;
    destroyed_count_ = 0;
    clone_attempts_ = 0;
    clone_failure_attempt_ = 0;
}

void TestFormatter::failCloneOn(std::size_t attempt)
{
    clone_attempts_ = 0;
    clone_failure_attempt_ = attempt;
}

void TestFormatter::disableCloneFailure()
{
    clone_failure_attempt_ = 0;
}

std::size_t TestFormatter::cloneAttempts()
{
    return clone_attempts_;
}

int TestFormatter::liveCount()
{
    return live_count_;
}

int TestFormatter::destroyedCount()
{
    return destroyed_count_;
}

}
