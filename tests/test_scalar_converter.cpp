#include "cppf/ScalarConverter.hpp"
#include "support/Test.hpp"

#include <ios>
#include <locale>
#include <sstream>
#include <string>

namespace
{

class CommaPunctuation : public std::numpunct<char>
{
protected:
    virtual char do_decimal_point() const
    {
        return ',';
    }
};

std::string convert(const std::string &literal)
{
    std::ostringstream output;

    cppf::ScalarConverter::write(literal, output);
    return output.str();
}

void checkExact(test_support::Suite &suite,
                const char *literal,
                const char *expected,
                const char *label)
{
    suite.check(convert(literal) == expected, label);
}

}

void testScalarConverter(test_support::Suite &suite)
{
    checkExact(suite, "a",
               "char: 'a'\nint: 97\nfloat: 97.0f\ndouble: 97.0\n",
               "scalar writes character projections");
    checkExact(suite, "9",
               "char: Non displayable\nint: 9\nfloat: 9.0f\n"
               "double: 9.0\n",
               "scalar writes digit projections");
    checkExact(suite, "42.5",
               "char: '*'\nint: 42\nfloat: 42.5f\ndouble: 42.5\n",
               "scalar writes fractional projections");
    checkExact(suite, "-0",
               "char: Non displayable\nint: 0\nfloat: -0.0f\n"
               "double: -0.0\n",
               "scalar preserves negative zero output");

    checkExact(suite, "31",
               "char: Non displayable\nint: 31\nfloat: 31.0f\n"
               "double: 31.0\n",
               "scalar marks ascii control as non-displayable");
    checkExact(suite, "32",
               "char: ' '\nint: 32\nfloat: 32.0f\ndouble: 32.0\n",
               "scalar writes ascii space");
    checkExact(suite, "39",
               "char: '\\''\nint: 39\nfloat: 39.0f\ndouble: 39.0\n",
               "scalar escapes ascii quote");
    checkExact(suite, "92",
               "char: '\\\\'\nint: 92\nfloat: 92.0f\ndouble: 92.0\n",
               "scalar escapes ascii backslash");
    checkExact(suite, "126",
               "char: '~'\nint: 126\nfloat: 126.0f\ndouble: 126.0\n",
               "scalar writes final printable ascii");
    checkExact(suite, "127",
               "char: Non displayable\nint: 127\nfloat: 127.0f\n"
               "double: 127.0\n",
               "scalar marks ascii delete as non-displayable");
    checkExact(suite, "128",
               "char: impossible\nint: 128\nfloat: 128.0f\ndouble: 128.0\n",
               "scalar rejects out-of-range ascii projection");

    suite.check(convert("-0.5").find("char: Non displayable\nint: 0\n") == 0,
                "scalar truncates negative fraction toward zero");
    suite.check(convert("-1").find("char: impossible\nint: -1\n") == 0,
                "scalar rejects negative character projection");
    suite.check(convert("127.9").find(
                    "char: Non displayable\nint: 127\n") == 0,
                "scalar truncates final ascii fraction");
    suite.check(convert("2147483647.9").find(
                    "char: impossible\nint: 2147483647\n") == 0,
                "scalar accepts upper fractional int edge");
    suite.check(convert("-2147483648.9").find(
                    "char: impossible\nint: -2147483648\n") == 0,
                "scalar accepts lower fractional int edge");
    suite.check(convert("2147483648.0").find(
                    "char: impossible\nint: impossible\n") == 0,
                "scalar rejects value above int range");
    suite.check(convert("-2147483649.0").find(
                    "char: impossible\nint: impossible\n") == 0,
                "scalar rejects value below int range");

    checkExact(suite, "nanf",
               "char: impossible\nint: impossible\nfloat: nanf\ndouble: nan\n",
               "scalar canonicalizes nan");
    checkExact(suite, "+inf",
               "char: impossible\nint: impossible\nfloat: +inff\n"
               "double: +inf\n",
               "scalar canonicalizes positive infinity");
    checkExact(suite, "-inff",
               "char: impossible\nint: impossible\nfloat: -inff\n"
               "double: -inf\n",
               "scalar canonicalizes negative infinity");

    suite.check(convert("3.402823669209385e38").find(
                    "float: impossible\n") != std::string::npos,
                "scalar rejects float overflow only");
    suite.check(convert("1e-50").find(
                    "float: impossible\ndouble: 1e-50\n") !=
                    std::string::npos,
                "scalar rejects float underflow only");
    checkExact(suite, "1.23456789",
               "char: Non displayable\nint: 1\nfloat: 1.23457f\n"
               "double: 1.23456789\n",
               "scalar fixes float and double precision");

    std::ostringstream configured;
    configured.setf(std::ios::scientific, std::ios::floatfield);
    configured.setf(std::ios::showpos);
    configured.setf(std::ios::left, std::ios::adjustfield);
    configured.precision(2);
    configured.fill('#');
    configured.width(80);
    const std::ios::fmtflags original_flags = configured.flags();
    const std::streamsize original_precision = configured.precision();
    const char original_fill = configured.fill();
    const std::streamsize original_width = configured.width();

    cppf::ScalarConverter::write("42.5", configured);
    suite.check(configured.str() ==
                    "char: '*'\nint: 42\nfloat: 42.5f\ndouble: 42.5\n",
                "scalar ignores caller formatting state");
    suite.check(configured.flags() == original_flags &&
                    configured.precision() == original_precision &&
                    configured.fill() == original_fill &&
                    configured.width() == original_width,
                "scalar preserves caller formatting state");

    std::ostringstream localized;
    localized.imbue(std::locale(std::locale::classic(),
                                new CommaPunctuation));
    cppf::ScalarConverter::write("42.5", localized);
    suite.check(localized.str().find("42.5f") != std::string::npos &&
                    localized.str().find("42,5") == std::string::npos,
                "scalar fixes classic decimal punctuation");

    std::ostringstream invalid_output;
    bool invalid = false;

    try
    {
        cppf::ScalarConverter::write("42f", invalid_output);
    }
    catch (const cppf::InvalidScalar &error)
    {
        invalid = std::string(error.what()) == "invalid scalar literal";
    }
    suite.check(invalid, "scalar exposes stable invalid literal error");
    suite.check(invalid_output.str().empty(),
                "invalid scalar writes no partial output");

    const std::string four_lines = convert("42");
    std::size_t newlines = 0;
    std::size_t index;

    for (index = 0; index < four_lines.size(); ++index)
    {
        if (four_lines[index] == '\n')
            ++newlines;
    }
    suite.check(newlines == 4 && !four_lines.empty() &&
                    four_lines[four_lines.size() - 1] == '\n',
                "scalar always writes four terminated lines");
}
