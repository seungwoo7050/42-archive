#include "cppf/ScalarConverter.hpp"

#include "ScalarLiteral.hpp"

#include <limits>
#include <locale>
#include <ostream>
#include <sstream>

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

std::string finiteNumber(double value, bool as_float, bool negative_zero)
{
    std::ostringstream output;
    std::string result;

    output.imbue(std::locale::classic());
    output.precision(as_float ? std::numeric_limits<float>::digits10
                              : std::numeric_limits<double>::digits10);
    if (value == 0.0 && negative_zero)
        result = "-0";
    else if (as_float)
        output << static_cast<float>(value);
    else
        output << value;
    if (result.empty())
        result = output.str();
    if (result.find('.') == std::string::npos &&
        result.find('e') == std::string::npos &&
        result.find('E') == std::string::npos)
        result += ".0";
    return result;
}

bool canProjectFloat(const cppf::scalar_detail::ScalarLiteral &literal)
{
    const double maximum = std::numeric_limits<float>::max();
    float value;

    if (!isValue(literal) || literal.value < -maximum ||
        literal.value > maximum)
        return false;
    value = static_cast<float>(literal.value);
    return literal.value == 0.0 || value != 0.0f;
}

void writeFloating(const cppf::scalar_detail::ScalarLiteral &literal,
                   std::ostream &output)
{
    output << "float: ";
    if (literal.kind == cppf::scalar_detail::literal_nan)
        output << "nanf";
    else if (literal.kind ==
             cppf::scalar_detail::literal_positive_infinity)
        output << "+inff";
    else if (literal.kind ==
             cppf::scalar_detail::literal_negative_infinity)
        output << "-inff";
    else if (!canProjectFloat(literal))
        output << "impossible";
    else
        output << finiteNumber(literal.value, true, literal.negative_zero)
               << 'f';
    output << '\n';
}

void writeDouble(const cppf::scalar_detail::ScalarLiteral &literal,
                 std::ostream &output)
{
    output << "double: ";
    if (literal.kind == cppf::scalar_detail::literal_nan)
        output << "nan";
    else if (literal.kind ==
             cppf::scalar_detail::literal_positive_infinity)
        output << "+inf";
    else if (literal.kind ==
             cppf::scalar_detail::literal_negative_infinity)
        output << "-inf";
    else
        output << finiteNumber(literal.value, false, literal.negative_zero);
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
    std::ostringstream rendered;

    rendered.imbue(std::locale::classic());
    writeCharacter(literal, rendered);
    writeInteger(literal, rendered);
    writeFloating(literal, rendered);
    writeDouble(literal, rendered);
    const std::string result = rendered.str();

    output.write(result.data(), static_cast<std::streamsize>(result.size()));
}

}
