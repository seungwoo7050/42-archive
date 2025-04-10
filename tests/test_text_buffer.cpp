#include "cppf/TextBuffer.hpp"
#include "support/Test.hpp"

#include <cstring>
#include <sstream>
#include <stdexcept>

void testTextBuffer(test_support::Suite &suite)
{
    cppf::TextBuffer empty;
    cppf::TextBuffer value("buffer");
    cppf::TextBuffer null_value(0);
    const cppf::TextBuffer &view = value;
    cppf::TextBuffer copy(value);
    cppf::TextBuffer assigned("old");
    cppf::TextBuffer chained("chain");
    const cppf::TextBuffer &self_alias = value;
    cppf::TextBuffer left("alpha");
    const cppf::TextBuffer right("beta");
    std::ostringstream output;
    bool threw = false;

    suite.check(empty.empty(), "text buffer empty state");
    suite.check(empty.size() == 0, "text buffer empty size");
    suite.check(std::strcmp(empty.c_str(), "") == 0,
                "text buffer empty terminator");
    suite.check(null_value.empty(), "text buffer null input becomes empty");
    suite.check(value.size() == 6, "text buffer stores length");
    suite.check(std::strcmp(value.c_str(), "buffer") == 0,
                "text buffer stores bytes");
    suite.check(view.at(1) == 'u', "text buffer const access");
    copy.at(0) = 'B';
    suite.check(std::strcmp(copy.c_str(), "Buffer") == 0,
                "text buffer copy is mutable");
    suite.check(std::strcmp(value.c_str(), "buffer") == 0,
                "text buffer copy owns independent storage");
    suite.check(&(assigned = value) == &assigned,
                "text buffer assignment returns self");
    suite.check(std::strcmp(assigned.c_str(), "buffer") == 0,
                "text buffer assignment copies bytes");
    chained = assigned = copy;
    suite.check(std::strcmp(chained.c_str(), "Buffer") == 0,
                "text buffer chained assignment");
    value = self_alias;
    suite.check(std::strcmp(value.c_str(), "buffer") == 0,
                "text buffer self assignment preserves value");
    suite.check(left + right == cppf::TextBuffer("alphabeta"),
                "text buffer addition composes values");
    suite.check(left == cppf::TextBuffer("alpha"),
                "text buffer addition preserves left operand");
    suite.check(right == cppf::TextBuffer("beta"),
                "text buffer addition preserves right operand");
    left += right;
    suite.check(left == cppf::TextBuffer("alphabeta"),
                "text buffer compound addition");
    left += left;
    suite.check(left == cppf::TextBuffer("alphabetaalphabeta"),
                "text buffer self concatenation");
    suite.check(cppf::TextBuffer("a") < cppf::TextBuffer("b"),
                "text buffer lexical order");
    suite.check(cppf::TextBuffer("a") != cppf::TextBuffer("b"),
                "text buffer inequality");
    output << right;
    suite.check(output.str() == "beta", "text buffer stream output");
    value.at(0) = 'B';
    suite.check(std::strcmp(value.c_str(), "Buffer") == 0,
                "text buffer mutable access");
    try
    {
        value.at(value.size());
    }
    catch (const std::out_of_range &)
    {
        threw = true;
    }
    suite.check(threw, "text buffer checks bounds");
}
