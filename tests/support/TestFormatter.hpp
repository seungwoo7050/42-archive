#ifndef CPP_FOUNDATION_TEST_FORMATTER_HPP
#define CPP_FOUNDATION_TEST_FORMATTER_HPP

#include "cppf/Formatter.hpp"

namespace test_support
{

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
    static int liveCount();
    static int destroyedCount();

private:
    TestFormatter &operator=(const TestFormatter &other);

    cppf::TextBuffer prefix_;
    static int live_count_;
    static int destroyed_count_;
};

}

#endif
