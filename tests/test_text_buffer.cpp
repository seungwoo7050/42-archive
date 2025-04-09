#include "cppf/TextBuffer.hpp"
#include "support/Test.hpp"

#include <cstring>
#include <stdexcept>

void testTextBuffer(test_support::Suite &suite)
{
    cppf::TextBuffer empty;
    cppf::TextBuffer value("buffer");
    cppf::TextBuffer null_value(0);
    const cppf::TextBuffer &view = value;
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
