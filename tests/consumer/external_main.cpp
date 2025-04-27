#include "cppf/Contact.hpp"
#include "cppf/ContactBook.hpp"
#include "cppf/FormatPipeline.hpp"
#include "cppf/Formatter.hpp"
#include "cppf/RpnEvaluator.hpp"
#include "cppf/TextBuffer.hpp"

#include <sstream>

int main()
{
    cppf::ContactBook book;

    book.add(cppf::Contact("Ada", "8 7 *"));
    book.add(cppf::Contact("Grace", "9 7 *"));
    if (book.size() != 2 || book.at(0).name() != "Ada")
        return 1;

    cppf::FormatPipeline pipeline;
    const cppf::UppercaseFormatter uppercase;

    pipeline.append(uppercase);
    if (pipeline.apply(cppf::TextBuffer(book.at(0).name().c_str())) !=
        cppf::TextBuffer("ADA"))
        return 1;

    if (cppf::RpnEvaluator::evaluate(book.at(0).note()) != 56 ||
        cppf::RpnEvaluator::evaluate(book.at(1).note()) != 63)
        return 1;

    std::ostringstream output;

    book.write(output);
    if (output.str() != "0|Ada|8 7 *\n1|Grace|9 7 *\n")
        return 1;
    return 0;
}
