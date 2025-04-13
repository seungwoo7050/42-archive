#include "cppf/Factory.hpp"

namespace cppf
{

const char *InvalidSpecification::what() const throw()
{
    return "invalid formatter specification";
}

const char *UnknownFormatter::what() const throw()
{
    return "unknown formatter";
}

FormatterCreator::~FormatterCreator()
{
}

Formatter *DefaultFormatterCreator::create(
    const std::string &specification) const
{
    const std::string prefix_key = "prefix=";
    const std::string suffix_key = "suffix=";

    if (specification.empty())
        throw InvalidSpecification();
    if (specification == "upper")
        return new UppercaseFormatter();
    if (specification.compare(0, prefix_key.size(), prefix_key) == 0)
    {
        if (specification.size() == prefix_key.size())
            throw InvalidSpecification();
        return new PrefixFormatter(
            TextBuffer(specification.substr(prefix_key.size()).c_str()));
    }
    if (specification.compare(0, suffix_key.size(), suffix_key) == 0)
    {
        if (specification.size() == suffix_key.size())
            throw InvalidSpecification();
        return new SuffixFormatter(
            TextBuffer(specification.substr(suffix_key.size()).c_str()));
    }
    throw UnknownFormatter();
}

}
