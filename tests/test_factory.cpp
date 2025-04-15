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

    std::string specifications[] = {"prefix=[", "upper", "suffix=]"};
    cppf::FormatPipeline pipeline;

    cppf::PipelineBuilder::replace(pipeline, creator, specifications, 3);
    suite.check(pipeline.size() == 3, "pipeline builder transfers three clones");
    suite.check(pipeline.apply(cppf::TextBuffer("value")) ==
                    cppf::TextBuffer("[VALUE]"),
                "pipeline builder preserves specification order");

    std::string invalid_specifications[] = {
        "prefix=<", "reverse", "suffix=>"};

    threw = false;
    try
    {
        cppf::PipelineBuilder::replace(
            pipeline, creator, invalid_specifications, 3);
    }
    catch (const cppf::UnknownFormatter &)
    {
        threw = true;
    }
    suite.check(threw, "pipeline builder reports a failed replacement");
    suite.check(pipeline.size() == 3,
                "failed replacement preserves the previous pipeline size");
    suite.check(pipeline.apply(cppf::TextBuffer("value")) ==
                    cppf::TextBuffer("[VALUE]"),
                "failed replacement preserves the previous pipeline value");

    threw = false;
    try
    {
        cppf::PipelineBuilder::replace(pipeline, creator, 0, 1);
    }
    catch (const cppf::InvalidSpecification &)
    {
        threw = true;
    }
    suite.check(threw, "pipeline builder rejects null specification array");
    suite.check(pipeline.apply(cppf::TextBuffer("value")) ==
                    cppf::TextBuffer("[VALUE]"),
                "invalid replacement preserves the previous pipeline");

    cppf::PipelineBuilder::replace(pipeline, creator, 0, 0);
    suite.check(pipeline.size() == 0, "pipeline builder accepts empty list");
}
