#include "cppf/Formatter.hpp"

#include <cctype>

namespace cppf
{

Formatter::~Formatter()
{
}

Formatter *UppercaseFormatter::clone() const
{
    return new UppercaseFormatter(*this);
}

TextBuffer UppercaseFormatter::apply(const TextBuffer &input) const
{
    TextBuffer output(input);
    std::size_t index;

    for (index = 0; index < output.size(); ++index)
    {
        const unsigned char byte = static_cast<unsigned char>(output.at(index));
        output.at(index) = static_cast<char>(std::toupper(byte));
    }
    return output;
}

const char *UppercaseFormatter::name() const
{
    return "upper";
}

PrefixFormatter::PrefixFormatter(const TextBuffer &prefix) : prefix_(prefix)
{
}

Formatter *PrefixFormatter::clone() const
{
    return new PrefixFormatter(*this);
}

TextBuffer PrefixFormatter::apply(const TextBuffer &input) const
{
    return prefix_ + input;
}

const char *PrefixFormatter::name() const
{
    return "prefix";
}

SuffixFormatter::SuffixFormatter(const TextBuffer &suffix) : suffix_(suffix)
{
}

Formatter *SuffixFormatter::clone() const
{
    return new SuffixFormatter(*this);
}

TextBuffer SuffixFormatter::apply(const TextBuffer &input) const
{
    return input + suffix_;
}

const char *SuffixFormatter::name() const
{
    return "suffix";
}

}
