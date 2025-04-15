#include "cppf/Factory.hpp"

#include <exception>
#include <iostream>
#include <string>

int main(int argument_count, char **arguments)
{
    std::string specifications[cppf::FormatPipeline::max_steps];
    cppf::FormatPipeline pipeline;
    const cppf::DefaultFormatterCreator creator;
    int index;

    if (argument_count < 3 ||
        argument_count - 2 > cppf::FormatPipeline::max_steps)
    {
        std::cerr << "usage: ex03_pipeline_factory TEXT SPEC..." << std::endl;
        return 1;
    }
    for (index = 2; index < argument_count; ++index)
        specifications[index - 2] = arguments[index];
    try
    {
        cppf::PipelineBuilder::replace(
            pipeline, creator, specifications, argument_count - 2);
        std::cout << pipeline.apply(cppf::TextBuffer(arguments[1]))
                  << std::endl;
    }
    catch (const std::exception &error)
    {
        std::cerr << error.what() << std::endl;
        return 1;
    }
    return 0;
}
