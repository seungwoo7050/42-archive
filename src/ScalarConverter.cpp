#include "cppf/ScalarConverter.hpp"

#include "ScalarLiteral.hpp"

#include <limits>
#include <ostream>

namespace
{

bool isValue(const cppf::scalar_detail::ScalarLiteral &literal)
{
    return literal.kind == cppf::scalar_detail::literal_character ||
           literal.kind == cppf::scalar_detail::literal_finite;
}

bool canProjectChar(const cppf::scalar_detail::ScalarLiteral &literal)
{
    return isValue(literal) && literal.value > -1.0 &&
           literal.value < 128.0;
}

bool canProjectInt(const cppf::scalar_detail::ScalarLiteral &literal)
{
    const double lower =
        static_cast<double>(std::numeric_limits<int>::min()) - 1.0;
    const double upper =
        static_cast<double>(std::numeric_limits<int>::max()) + 1.0;

    return isValue(literal) && literal.value > lower &&
           literal.value < upper;
}

std::string quotedCharacter(int value)
{
    if (value == '\'')
        return "'\\''";
    if (value == '\\')
        return "'\\\\'";
    return std::string("'") + static_cast<char>(value) + "'";
}

void writeCharacter(const cppf::scalar_detail::ScalarLiteral &literal,
                    std::ostream &output)
{
    output << "char: ";
    if (!canProjectChar(literal))
        output << "impossible";
    else
    {
        const int value = static_cast<int>(literal.value);

        if (value < 32 || value > 126)
            output << "Non displayable";
        else
            output << quotedCharacter(value);
    }
    output << '\n';
}

void writeInteger(const cppf::scalar_detail::ScalarLiteral &literal,
                  std::ostream &output)
{
    output << "int: ";
    if (!canProjectInt(literal))
        output << "impossible";
    else
        output << static_cast<int>(literal.value);
    output << '\n';
}

}

namespace cppf
{

const char *InvalidScalar::what() const throw()
{
    return "invalid scalar literal";
}

void ScalarConverter::write(const std::string &text, std::ostream &output)
{
    scalar_detail::ScalarLiteral literal;

    try
    {
        literal = scalar_detail::parseScalarLiteral(text);
    }
    catch (const scalar_detail::ScalarParseError &)
    {
        throw InvalidScalar();
    }
    writeCharacter(literal, output);
    writeInteger(literal, output);
}

}
