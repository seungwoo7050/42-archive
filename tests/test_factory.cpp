#include "cppf/Factory.hpp"
#include "support/Test.hpp"
#include "support/TestFormatter.hpp"

#include <cstring>

namespace
{

class CreationFailure
{
};

class ControlledCreator : public cppf::FormatterCreator
{
public:
    explicit ControlledCreator(std::size_t failure_attempt)
        : attempts_(0), failure_attempt_(failure_attempt)
    {
    }

    virtual cppf::Formatter *create(
        const std::string &specification) const
    {
        ++attempts_;
        if (failure_attempt_ != 0 && attempts_ == failure_attempt_)
            throw CreationFailure();
        return new test_support::TestFormatter(
            cppf::TextBuffer(specification.c_str()));
    }

    std::size_t attempts() const
    {
        return attempts_;
    }

private:
    ControlledCreator(const ControlledCreator &other);
    ControlledCreator &operator=(const ControlledCreator &other);

    mutable std::size_t attempts_;
    std::size_t failure_attempt_;
};

void testCreationFailure(test_support::Suite &suite)
{
    const cppf::UppercaseFormatter upper;
    const std::string specifications[] = {"first", "second", "third"};
    cppf::FormatPipeline target;
    const ControlledCreator creator(2);
    bool threw = false;

    target.append(upper);
    test_support::TestFormatter::resetCounters();
    try
    {
        cppf::PipelineBuilder::replace(
            target, creator, specifications, 3);
    }
    catch (const CreationFailure &)
    {
        threw = true;
    }
    suite.check(threw, "pipeline builder preserves creation failure type");
    suite.check(creator.attempts() == 2,
                "pipeline builder stops at failed creation");
    suite.check(test_support::TestFormatter::cloneAttempts() == 1,
                "creation failure follows one completed clone");
    suite.check(target.size() == 1,
                "creation failure preserves target size");
    suite.check(target.apply(cppf::TextBuffer("keep")) ==
                    cppf::TextBuffer("KEEP"),
                "creation failure preserves target behavior");
    suite.check(test_support::TestFormatter::liveCount() == 0,
                "creation failure releases candidate formatters");
}

void testCloneFailure(test_support::Suite &suite)
{
    const cppf::UppercaseFormatter upper;
    const std::string specifications[] = {"first", "second", "third"};
    cppf::FormatPipeline target;
    const ControlledCreator creator(0);
    bool threw = false;

    target.append(upper);
    test_support::TestFormatter::resetCounters();
    test_support::TestFormatter::failCloneOn(2);
    try
    {
        cppf::PipelineBuilder::replace(
            target, creator, specifications, 3);
    }
    catch (const test_support::CloneFailure &)
    {
        threw = true;
    }
    test_support::TestFormatter::disableCloneFailure();
    suite.check(threw, "pipeline builder preserves clone failure type");
    suite.check(creator.attempts() == 2,
                "pipeline builder stops at failed clone");
    suite.check(test_support::TestFormatter::cloneAttempts() == 2,
                "pipeline builder reaches configured clone failure");
    suite.check(target.size() == 1,
                "clone failure preserves target size");
    suite.check(target.apply(cppf::TextBuffer("keep")) ==
                    cppf::TextBuffer("KEEP"),
                "clone failure preserves target behavior");
    suite.check(test_support::TestFormatter::liveCount() == 0,
                "clone failure releases creator and candidate objects");
}

}

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

    testCreationFailure(suite);
    testCloneFailure(suite);
}
