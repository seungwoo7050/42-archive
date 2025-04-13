#ifndef CPPF_FACTORY_HPP
#define CPPF_FACTORY_HPP

#include "cppf/FormatPipeline.hpp"

#include <cstddef>
#include <exception>
#include <string>

namespace cppf
{

class InvalidSpecification : public std::exception
{
public:
    virtual const char *what() const throw();
};

class UnknownFormatter : public std::exception
{
public:
    virtual const char *what() const throw();
};

class FormatterCreator
{
public:
    virtual ~FormatterCreator();
    virtual Formatter *create(const std::string &specification) const = 0;
};

class DefaultFormatterCreator : public FormatterCreator
{
public:
    virtual Formatter *create(const std::string &specification) const;
};

class PipelineBuilder
{
public:
    static void replace(FormatPipeline &target,
                        const FormatterCreator &creator,
                        const std::string *specifications,
                        std::size_t count);

private:
    PipelineBuilder();
};

}

#endif
