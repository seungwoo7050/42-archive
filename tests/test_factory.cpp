#include "cppf/Factory.hpp"
#include "support/Test.hpp"

#include <cstring>

void testFactory(test_support::Suite &suite)
{
    const cppf::DefaultFormatterCreator creator;
    cppf::Formatter *formatter;
    bool threw;

    formatter = creator.create("upper");
    suite.check(std::strcmp(formatter->name(), "upper") == 0,
                "factory creates uppercase formatter");
    delete formatter;

    formatter = creator.create("prefix=[");
    suite.check(formatter->apply(cppf::TextBuffer("x")) ==
                    cppf::TextBuffer("[x"),
                "factory parses prefix payload");
    delete formatter;

    formatter = creator.create("suffix=]");
    suite.check(formatter->apply(cppf::TextBuffer("x")) ==
                    cppf::TextBuffer("x]"),
                "factory parses suffix payload");
    delete formatter;

    threw = false;
    try
    {
        formatter = creator.create("");
    }
    catch (const cppf::InvalidSpecification &error)
    {
        threw = std::strcmp(error.what(), "invalid formatter specification") == 0;
    }
    suite.check(threw, "factory rejects empty specification");

    threw = false;
    try
    {
        formatter = creator.create("prefix=");
    }
    catch (const cppf::InvalidSpecification &)
    {
        threw = true;
    }
    suite.check(threw, "factory rejects empty payload");

    threw = false;
    try
    {
        formatter = creator.create("reverse");
    }
    catch (const cppf::UnknownFormatter &error)
    {
        threw = std::strcmp(error.what(), "unknown formatter") == 0;
    }
    suite.check(threw, "factory distinguishes unknown formatter");
}
