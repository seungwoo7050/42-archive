#include "cppf/Formatter.hpp"
#include "support/Test.hpp"

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
}
