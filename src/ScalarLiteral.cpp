#include "ScalarLiteral.hpp"

#include <limits>
#include <locale>
#include <sstream>

namespace
{

bool isDigit(char value)
{
    return value >= '0' && value <= '9';
}

bool isWhitespace(char value)
{
    return value == ' ' || value == '\t' || value == '\n' ||
           value == '\v' || value == '\f' || value == '\r';
}

void rejectInvalidBytes(const std::string &text)
{
    if (text.empty())
        throw cppf::scalar_detail::ScalarParseError();
    for (std::size_t index = 0; index < text.size(); ++index)
    {
        const unsigned char value =
            static_cast<unsigned char>(text[index]);

        if (value == 0 || value > 127 || isWhitespace(text[index]))
            throw cppf::scalar_detail::ScalarParseError();
    }
}

void validateFiniteGrammar(const std::string &text, bool &float_suffix)
{
    std::size_t index = 0;
    std::size_t mantissa_digits = 0;

    if (text[index] == '+' || text[index] == '-')
        ++index;
    while (index < text.size() && isDigit(text[index]))
    {
        ++mantissa_digits;
        ++index;
    }
    if (index < text.size() && text[index] == '.')
    {
        ++index;
        while (index < text.size() && isDigit(text[index]))
        {
            ++mantissa_digits;
            ++index;
        }
    }
    if (mantissa_digits == 0)
        throw cppf::scalar_detail::ScalarParseError();
    if (index < text.size() && (text[index] == 'e' || text[index] == 'E'))
    {
        std::size_t exponent_digits = 0;

        ++index;
        if (index < text.size() &&
            (text[index] == '+' || text[index] == '-'))
            ++index;
        while (index < text.size() && isDigit(text[index]))
        {
            ++exponent_digits;
            ++index;
        }
        if (exponent_digits == 0)
            throw cppf::scalar_detail::ScalarParseError();
    }
    float_suffix = index < text.size() && text[index] == 'f';
    if (float_suffix)
        ++index;
    if (index != text.size())
        throw cppf::scalar_detail::ScalarParseError();
}

}

namespace cppf
{
namespace scalar_detail
{

ScalarLiteral parseScalarLiteral(const std::string &text)
{
    ScalarLiteral literal;

    rejectInvalidBytes(text);
    literal.float_suffix = text[text.size() - 1] == 'f';
    literal.negative_zero = false;
    if (text == "nan" || text == "nanf")
    {
        literal.kind = literal_nan;
        literal.value = std::numeric_limits<double>::quiet_NaN();
        return literal;
    }
    if (text == "+inf" || text == "+inff" ||
        text == "-inf" || text == "-inff")
    {
        literal.kind = text[0] == '-' ? literal_negative_infinity
                                      : literal_positive_infinity;
        literal.value = text[0] == '-'
                            ? -std::numeric_limits<double>::infinity()
                            : std::numeric_limits<double>::infinity();
        return literal;
    }
    if (text.size() == 1 && !isDigit(text[0]))
    {
        literal.kind = literal_character;
        literal.value = static_cast<unsigned char>(text[0]);
        literal.float_suffix = false;
        return literal;
    }
    validateFiniteGrammar(text, literal.float_suffix);
    const std::string number = literal.float_suffix
                                   ? text.substr(0, text.size() - 1)
                                   : text;
    std::istringstream input(number);

    input.imbue(std::locale::classic());
    input >> literal.value;
    if (input.fail() || !input.eof())
        throw ScalarParseError();
    literal.kind = literal_finite;
    literal.negative_zero = text[0] == '-' && literal.value == 0.0;
    return literal;
}

}
}
