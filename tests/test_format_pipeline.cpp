#include "cppf/FormatPipeline.hpp"
#include "support/Test.hpp"

#include <cstring>
#include <stdexcept>

void testFormatPipeline(test_support::Suite &suite)
{
    cppf::FormatPipeline pipeline;
    const cppf::PrefixFormatter prefix(cppf::TextBuffer("["));
    const cppf::UppercaseFormatter upper;
    const cppf::SuffixFormatter suffix(cppf::TextBuffer("]"));
    bool threw = false;
    std::size_t index;

    suite.check(pipeline.size() == 0, "format pipeline starts empty");
    suite.check(pipeline.apply(cppf::TextBuffer("same")) ==
                    cppf::TextBuffer("same"),
                "empty format pipeline is identity");
    pipeline.append(prefix);
    pipeline.append(upper);
    pipeline.append(suffix);
    suite.check(pipeline.size() == 3, "format pipeline counts clones");
    suite.check(pipeline.apply(cppf::TextBuffer("value")) ==
                    cppf::TextBuffer("[VALUE]"),
                "format pipeline dispatch order");

    cppf::FormatPipeline copy(pipeline);
    cppf::FormatPipeline assigned;
    const cppf::FormatPipeline &self_alias = pipeline;

    pipeline.append(suffix);
    suite.check(copy.size() == 3, "format pipeline copy owns independent steps");
    suite.check(copy.apply(cppf::TextBuffer("value")) ==
                    cppf::TextBuffer("[VALUE]"),
                "format pipeline copy preserves dynamic behavior");
    suite.check(&(assigned = copy) == &assigned,
                "format pipeline assignment returns self");
    suite.check(assigned.apply(cppf::TextBuffer("x")) ==
                    cppf::TextBuffer("[X]"),
                "format pipeline assignment clones steps");
    pipeline = self_alias;
    suite.check(pipeline.size() == 4,
                "format pipeline self assignment preserves state");

    cppf::FormatPipeline full;
    for (index = 0; index < cppf::FormatPipeline::max_steps; ++index)
        full.append(upper);
    try
    {
        full.append(upper);
    }
    catch (const std::length_error &)
    {
        threw = true;
    }
    suite.check(threw, "format pipeline rejects capacity overflow");
    suite.check(full.size() == cppf::FormatPipeline::max_steps,
                "capacity failure preserves pipeline");
}
