#include "cppf/Formatter.hpp"
#include "cppf/Formatter.hpp"
#include "cppf/FormatPipeline.hpp"
#include "cppf/FormatPipeline.hpp"

int main()
{
    const cppf::UppercaseFormatter formatter;
    cppf::FormatPipeline pipeline;

    pipeline.append(formatter);
    return pipeline.apply(cppf::TextBuffer("a")) == cppf::TextBuffer("A")
               ? 0
               : 1;
}
