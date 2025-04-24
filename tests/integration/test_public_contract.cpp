#include "cppf/BatchEngine.hpp"
#include "cppf/Contact.hpp"
#include "cppf/ContactBook.hpp"
#include "cppf/Factory.hpp"
#include "cppf/FormatPipeline.hpp"
#include "cppf/Formatter.hpp"
#include "cppf/RandomAccessBatch.hpp"
#include "cppf/RpnEvaluator.hpp"
#include "cppf/RuntimeType.hpp"
#include "cppf/ScalarConverter.hpp"
#include "cppf/Serializer.hpp"
#include "cppf/TextBuffer.hpp"

#include <deque>
#include <sstream>
#include <string>

namespace
{

bool resultLess(const cppf::JobResult &left,
                const cppf::JobResult &right)
{
    if (left.value() != right.value())
        return left.value() < right.value();
    return left.name() < right.name();
}

}

int main()
{
    cppf::ContactBook source;

    source.add(cppf::Contact("alpha", "60 5 +"));
    source.add(cppf::Contact("beta", "10 2 *"));
    const cppf::ContactBook &records = source;
    const cppf::TextBuffer owned_name(records.at(0).name().c_str());
    cppf::TextBuffer independent_name(owned_name);
    independent_name.at(0) = 'A';
    if (owned_name != cppf::TextBuffer("alpha") ||
        independent_name != cppf::TextBuffer("Alpha"))
        return 1;

    const cppf::DefaultFormatterCreator creator;
    const std::string valid[] = {"prefix=[", "upper", "suffix=]"};
    const std::string invalid[] = {"prefix=<", "unknown", "suffix=>"};
    cppf::FormatPipeline pipeline;
    bool rejected = false;

    cppf::PipelineBuilder::replace(pipeline, creator, valid, 3);
    const cppf::TextBuffer label = pipeline.apply(owned_name);
    try
    {
        cppf::PipelineBuilder::replace(pipeline, creator, invalid, 3);
    }
    catch (const cppf::UnknownFormatter &)
    {
        rejected = true;
    }
    if (!rejected || label != cppf::TextBuffer("[ALPHA]") ||
        pipeline.apply(owned_name) != label)
        return 1;

    std::ostringstream batch_input_text;
    batch_input_text << records.at(0).name() << " | "
                     << records.at(0).note() << '\n'
                     << records.at(1).name() << " | "
                     << records.at(1).note();
    std::istringstream batch_input(batch_input_text.str());
    cppf::BatchEngine engine;

    engine.replace(batch_input);
    if (engine.results().size() != 2 ||
        !(engine.results()[0] == cppf::JobResult("beta", 20)) ||
        !(engine.results()[1] == cppf::JobResult("alpha", 65)) ||
        cppf::RpnEvaluator::evaluate(records.at(0).note()) != 65)
        return 1;

    cppf::RandomAccessBatch<cppf::JobResult> vector_results;
    cppf::RandomAccessBatch<cppf::JobResult,
                            std::deque<cppf::JobResult> > deque_results;
    std::size_t index;

    for (index = 0; index < engine.results().size(); ++index)
    {
        vector_results.push_back(engine.results()[index]);
        deque_results.push_back(engine.results()[index]);
    }
    vector_results.sort(resultLess);
    deque_results.sort(resultLess);
    if (!cppf::equal_ranges(vector_results.begin(), vector_results.end(),
                            deque_results.begin(), deque_results.end()))
        return 1;

    std::ostringstream scalar_output;
    cppf::ScalarConverter::write("65", scalar_output);
    if (scalar_output.str() !=
        "char: 'A'\nint: 65\nfloat: 65.0f\ndouble: 65.0\n")
        return 1;

    cppf::RuntimeBase *runtime =
        cppf::RuntimeInspector::create(cppf::runtime_a);
    const bool runtime_matches =
        runtime != 0 &&
        cppf::RuntimeInspector::identify(runtime) == cppf::runtime_a &&
        cppf::RuntimeInspector::identify(*runtime) == cppf::runtime_a;
    delete runtime;
    if (!runtime_matches)
        return 1;

    cppf::Payload payload(
        static_cast<unsigned long>(engine.results()[1].value()),
        label.c_str());
    const cppf::Serializer::raw_type raw =
        cppf::Serializer::serialize(&payload);
    cppf::Payload *recovered = cppf::Serializer::deserialize(raw);

    if (recovered != &payload || recovered->id != 65 ||
        recovered->label != "[ALPHA]")
        return 1;
    return 0;
}
