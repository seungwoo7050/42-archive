#include "../src/ScalarLiteral.hpp"
#include "support/Test.hpp"

#include <string>

namespace
{

void checkInvalid(test_support::Suite &suite,
                  const std::string &text,
                  const char *label)
{
    bool threw = false;

    try
    {
        cppf::scalar_detail::parseScalarLiteral(text);
    }
    catch (const cppf::scalar_detail::ScalarParseError &)
    {
        threw = true;
    }
    suite.check(threw, label);
}

void checkCharacter(test_support::Suite &suite,
                    const char *text,
                    int expected,
                    const char *label)
{
    const cppf::scalar_detail::ScalarLiteral literal =
        cppf::scalar_detail::parseScalarLiteral(text);

    suite.check(literal.kind == cppf::scalar_detail::literal_character &&
                    literal.value == expected,
                label);
}

void checkFinite(test_support::Suite &suite,
                 const char *text,
                 double expected,
                 bool float_suffix,
                 const char *label)
{
    const cppf::scalar_detail::ScalarLiteral literal =
        cppf::scalar_detail::parseScalarLiteral(text);

    suite.check(literal.kind == cppf::scalar_detail::literal_finite &&
                    literal.value == expected &&
                    literal.float_suffix == float_suffix,
                label);
}

void checkNegativeZero(test_support::Suite &suite,
                       const char *text,
                       const char *label)
{
    const cppf::scalar_detail::ScalarLiteral literal =
        cppf::scalar_detail::parseScalarLiteral(text);

    suite.check(literal.kind == cppf::scalar_detail::literal_finite &&
                    literal.value == 0.0 && literal.negative_zero,
                label);
}

void checkSpecial(test_support::Suite &suite,
                  const char *text,
                  cppf::scalar_detail::LiteralKind kind,
                  bool float_suffix,
                  const char *label)
{
    const cppf::scalar_detail::ScalarLiteral literal =
        cppf::scalar_detail::parseScalarLiteral(text);

    suite.check(literal.kind == kind &&
                    literal.float_suffix == float_suffix,
                label);
}

}

void testScalarLiteral(test_support::Suite &suite)
{
    checkCharacter(suite, "a", 97, "scalar parses alphabetic character");
    checkCharacter(suite, "f", 102, "scalar prefers lone f character");
    checkCharacter(suite, "+", 43, "scalar parses lone plus character");
    checkCharacter(suite, "-", 45, "scalar parses lone minus character");
    checkCharacter(suite, ".", 46, "scalar parses lone point character");

    checkFinite(suite, "0", 0.0, false, "scalar prefers zero number");
    checkFinite(suite, "9", 9.0, false, "scalar prefers digit number");
    checkFinite(suite, "+42", 42.0, false, "scalar parses positive integer");
    checkFinite(suite, "-42", -42.0, false, "scalar parses negative integer");
    checkFinite(suite, "42.", 42.0, false, "scalar parses trailing point");
    checkFinite(suite, ".5", 0.5, false, "scalar parses leading point");
    checkFinite(suite, "1.e2", 100.0, false, "scalar parses point exponent");
    checkFinite(suite, "1e2", 100.0, false, "scalar parses exponent");
    checkFinite(suite, "1e2f", 100.0, true, "scalar parses float exponent");

    checkNegativeZero(suite, "-0", "scalar preserves integer negative zero");
    checkNegativeZero(suite, "-0.0", "scalar preserves decimal negative zero");
    checkNegativeZero(suite, "-0e20", "scalar preserves exponent negative zero");
    checkNegativeZero(suite, "-0.0f", "scalar preserves float negative zero");

    checkSpecial(suite, "nan", cppf::scalar_detail::literal_nan, false,
                 "scalar parses double nan");
    checkSpecial(suite, "nanf", cppf::scalar_detail::literal_nan, true,
                 "scalar parses float nan");
    checkSpecial(suite, "+inf",
                 cppf::scalar_detail::literal_positive_infinity, false,
                 "scalar parses positive double infinity");
    checkSpecial(suite, "+inff",
                 cppf::scalar_detail::literal_positive_infinity, true,
                 "scalar parses positive float infinity");
    checkSpecial(suite, "-inf",
                 cppf::scalar_detail::literal_negative_infinity, false,
                 "scalar parses negative double infinity");
    checkSpecial(suite, "-inff",
                 cppf::scalar_detail::literal_negative_infinity, true,
                 "scalar parses negative float infinity");

    checkInvalid(suite, "", "scalar rejects empty input");
    checkInvalid(suite, " ", "scalar rejects space");
    checkInvalid(suite, "\t42", "scalar rejects leading tab");
    checkInvalid(suite, "42\n", "scalar rejects trailing newline");
    checkInvalid(suite, "4 2", "scalar rejects embedded space");
    checkInvalid(suite, "++1", "scalar rejects repeated sign");
    checkInvalid(suite, "..", "scalar rejects repeated point");
    checkInvalid(suite, "1e", "scalar rejects empty exponent");
    checkInvalid(suite, "1e+", "scalar rejects signed empty exponent");
    checkInvalid(suite, "42f", "scalar rejects suffix without float syntax");
    checkInvalid(suite, "42F", "scalar rejects uppercase suffix");
    checkInvalid(suite, "0x10", "scalar rejects hexadecimal syntax");
    checkInvalid(suite, "1,5", "scalar rejects locale decimal comma");
    checkInvalid(suite, "42x", "scalar rejects trailing garbage");
    checkInvalid(suite, "nanx", "scalar rejects extended nan");
    checkInvalid(suite, "inf", "scalar rejects unsigned infinity");
    checkInvalid(suite, "+nan", "scalar rejects signed nan");
    checkInvalid(suite, std::string("4\0", 2),
                 "scalar rejects embedded nul");
    checkInvalid(suite, "1e309", "scalar rejects double overflow");
    checkInvalid(suite, "1e-9999", "scalar rejects nonzero underflow");
}
