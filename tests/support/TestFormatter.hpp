#ifndef CPP_FOUNDATION_TEST_FORMATTER_HPP
#define CPP_FOUNDATION_TEST_FORMATTER_HPP

#include "cppf/Formatter.hpp"

#include <cstddef>

namespace test_support
{

class CloneFailure
{
};

class TestFormatter : public cppf::Formatter
{
public:
    explicit TestFormatter(const cppf::TextBuffer &prefix);
    TestFormatter(const TestFormatter &other);
    virtual ~TestFormatter();

    virtual cppf::Formatter *clone() const;
    virtual cppf::TextBuffer apply(const cppf::TextBuffer &input) const;
    virtual const char *name() const;

    static void resetCounters();
    static void failCloneOn(std::size_t attempt);
    static void disableCloneFailure();
    static std::size_t cloneAttempts();
    static int liveCount();
    static int destroyedCount();

private:
    TestFormatter &operator=(const TestFormatter &other);

    cppf::TextBuffer prefix_;
    static int live_count_;
    static int destroyed_count_;
    static std::size_t clone_attempts_;
    static std::size_t clone_failure_attempt_;
};

}

#endif
