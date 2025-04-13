#include "cppf/Formatter.hpp"
#include "support/Test.hpp"
#include "support/TestFormatter.hpp"

#include <cstring>

namespace
{

void checkFormatter(test_support::Suite &suite,
                    const cppf::Formatter &formatter,
                    const char *input,
                    const char *expected,
                    const char *expected_name)
{
    const cppf::TextBuffer result = formatter.apply(cppf::TextBuffer(input));

    suite.check(std::strcmp(result.c_str(), expected) == 0,
                "formatter virtual apply");
    suite.check(std::strcmp(formatter.name(), expected_name) == 0,
                "formatter virtual name");
}

}

void testFormatter(test_support::Suite &suite)
{
    const cppf::UppercaseFormatter upper;
    const cppf::PrefixFormatter prefix(cppf::TextBuffer("["));
    const cppf::SuffixFormatter suffix(cppf::TextBuffer("]"));

    checkFormatter(suite, upper, "Abc-9", "ABC-9", "upper");
    checkFormatter(suite, prefix, "value", "[value", "prefix");
    checkFormatter(suite, suffix, "value", "value]", "suffix");

    test_support::TestFormatter::resetCounters();
    cppf::Formatter *owned =
        new test_support::TestFormatter(cppf::TextBuffer("!"));
    suite.check(test_support::TestFormatter::liveCount() == 1,
                "derived formatter becomes live");
    delete owned;
    suite.check(test_support::TestFormatter::liveCount() == 0,
                "base deletion destroys derived formatter");
    suite.check(test_support::TestFormatter::destroyedCount() == 1,
                "derived destructor runs exactly once");

    const test_support::TestFormatter original(cppf::TextBuffer("#"));
    cppf::Formatter *cloned = original.clone();
    suite.check(cloned->apply(cppf::TextBuffer("x")) ==
                    cppf::TextBuffer("#x"),
                "polymorphic clone preserves dynamic state");
    suite.check(std::strcmp(cloned->name(), "test") == 0,
                "polymorphic clone preserves dynamic name");
    delete cloned;
}
