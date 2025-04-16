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
    std::size_t index;

    if (text.empty())
        throw cppf::scalar_detail::ScalarParseError();
    for (index = 0; index < text.size(); ++index)
    {
        const unsigned char value =
            static_cast<unsigned char>(text[index]);

        if (value == 0 || value > 127 || isWhitespace(text[index]))
            throw cppf::scalar_detail::ScalarParseError();
    }
}

cppf::scalar_detail::ScalarLiteral makeSpecial(
    cppf::scalar_detail::LiteralKind kind,
    bool float_suffix)
{
    cppf::scalar_detail::ScalarLiteral literal;

    literal.kind = kind;
    literal.float_suffix = float_suffix;
    literal.negative_zero = false;
    if (kind == cppf::scalar_detail::literal_nan)
        literal.value = std::numeric_limits<double>::quiet_NaN();
    else if (kind == cppf::scalar_detail::literal_negative_infinity)
        literal.value = -std::numeric_limits<double>::infinity();
    else
        literal.value = std::numeric_limits<double>::infinity();
    return literal;
}

bool allMantissaDigitsAreZero(const std::string &text)
{
    std::size_t index = 0;

    if (text[index] == '+' || text[index] == '-')
        ++index;
    while (index < text.size() && text[index] != 'e' &&
           text[index] != 'E' && text[index] != 'f')
    {
        if (isDigit(text[index]) && text[index] != '0')
            return false;
        ++index;
    }
    return true;
}

void validateFiniteGrammar(const std::string &text, bool &float_suffix)
{
    std::size_t index = 0;
    std::size_t integer_digits = 0;
    std::size_t fraction_digits = 0;
    bool has_point = false;
    bool has_exponent = false;

    if (text[index] == '+' || text[index] == '-')
        ++index;
    while (index < text.size() && isDigit(text[index]))
    {
        ++integer_digits;
        ++index;
    }
    if (index < text.size() && text[index] == '.')
    {
        has_point = true;
        ++index;
        while (index < text.size() && isDigit(text[index]))
        {
            ++fraction_digits;
            ++index;
        }
    }
    if (integer_digits == 0 && fraction_digits == 0)
        throw cppf::scalar_detail::ScalarParseError();
    if (index < text.size() && (text[index] == 'e' || text[index] == 'E'))
    {
        std::size_t exponent_digits = 0;

        has_exponent = true;
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
    float_suffix = false;
    if (index < text.size() && text[index] == 'f')
    {
        float_suffix = true;
        ++index;
    }
    if (index != text.size() || (float_suffix && !has_point && !has_exponent))
        throw cppf::scalar_detail::ScalarParseError();
}

double extractFiniteValue(const std::string &text, bool float_suffix)
{
    const std::string number =
        float_suffix ? text.substr(0, text.size() - 1) : text;
    std::istringstream input(number);
    double value;

    input.imbue(std::locale::classic());
    input >> value;
    if (input.fail() || !input.eof() || value != value ||
        value > std::numeric_limits<double>::max() ||
        value < -std::numeric_limits<double>::max())
        throw cppf::scalar_detail::ScalarParseError();
    return value;
}

}

namespace cppf
{
namespace scalar_detail
{

ScalarLiteral parseScalarLiteral(const std::string &text)
{
    ScalarLiteral literal;
    bool float_suffix;
    bool all_zero;

    rejectInvalidBytes(text);
    if (text == "nan" || text == "nanf")
        return makeSpecial(literal_nan, text == "nanf");
    if (text == "+inf" || text == "+inff")
        return makeSpecial(literal_positive_infinity, text == "+inff");
    if (text == "-inf" || text == "-inff")
        return makeSpecial(literal_negative_infinity, text == "-inff");
    if (text.size() == 1 && !isDigit(text[0]) &&
        static_cast<unsigned char>(text[0]) >= 33)
    {
        literal.kind = literal_character;
        literal.value = static_cast<unsigned char>(text[0]);
        literal.float_suffix = false;
        literal.negative_zero = false;
        return literal;
    }
    validateFiniteGrammar(text, float_suffix);
    all_zero = allMantissaDigitsAreZero(text);
    literal.kind = literal_finite;
    literal.float_suffix = float_suffix;
    literal.negative_zero = text[0] == '-' && all_zero;
    if (all_zero)
        literal.value = literal.negative_zero ? -0.0 : 0.0;
    else
    {
        literal.value = extractFiniteValue(text, float_suffix);
        if (literal.value == 0.0)
            throw ScalarParseError();
    }
    return literal;
}

}
}
