#ifndef CPPF_SCALAR_CONVERTER_HPP
#define CPPF_SCALAR_CONVERTER_HPP

#include <exception>
#include <iosfwd>
#include <string>

namespace cppf
{

class InvalidScalar : public std::exception
{
public:
    virtual const char *what() const throw();
};

class ScalarConverter
{
public:
    static void write(const std::string &literal, std::ostream &output);

private:
    ScalarConverter();
    ScalarConverter(const ScalarConverter &other);
    ScalarConverter &operator=(const ScalarConverter &other);
};

}

#endif
