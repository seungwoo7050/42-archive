#include "cppf/Factory.hpp"
#include "cppf/Factory.hpp"

int main()
{
    const cppf::DefaultFormatterCreator creator;
    cppf::Formatter *formatter = creator.create("upper");
    const std::string specifications[] = {"prefix=[", "suffix=]"};
    cppf::FormatPipeline pipeline;

    delete formatter;
    cppf::PipelineBuilder::replace(pipeline, creator, specifications, 2);
    return pipeline.size() != 2;
}
