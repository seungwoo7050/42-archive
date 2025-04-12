#include "cppf/FormatPipeline.hpp"

#include <iostream>

int main(int argument_count, char **arguments)
{
    if (argument_count != 2)
    {
        std::cerr << "usage: ex02_format_pipeline TEXT" << std::endl;
        return 1;
    }
    const cppf::PrefixFormatter prefix(cppf::TextBuffer("["));
    const cppf::UppercaseFormatter upper;
    const cppf::SuffixFormatter suffix(cppf::TextBuffer("]"));
    cppf::FormatPipeline pipeline;

    pipeline.append(prefix);
    pipeline.append(upper);
    pipeline.append(suffix);
    std::cout << pipeline.apply(cppf::TextBuffer(arguments[1])) << std::endl;
    return 0;
}
