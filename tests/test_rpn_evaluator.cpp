#include "cppf/RpnEvaluator.hpp"
#include "support/Test.hpp"

#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>

namespace
{

std::string decimal(long value)
{
    std::ostringstream output;

    output << value;
    return output.str();
}

std::string unsignedDecimal(unsigned long value)
{
    std::ostringstream output;

    output << value;
    return output.str();
}

void checkInvalid(test_support::Suite &suite,
                  const std::string &expression,
                  const char *label)
{
    bool invalid = false;

    try
    {
        cppf::RpnEvaluator::evaluate(expression);
    }
    catch (const std::invalid_argument &error)
    {
        invalid = std::string(error.what()) == "invalid rpn expression";
    }
    suite.check(invalid, label);
}

void checkOverflow(test_support::Suite &suite,
                   const std::string &expression,
                   const char *label)
{
    bool overflow = false;

    try
    {
        cppf::RpnEvaluator::evaluate(expression);
    }
    catch (const std::overflow_error &error)
    {
        overflow = std::string(error.what()) == "rpn overflow";
    }
    suite.check(overflow, label);
}

}

void testRpnEvaluator(test_support::Suite &suite)
{
    suite.check(cppf::RpnEvaluator::evaluate("3 4 +") == 7,
                "rpn adds operands");
    suite.check(cppf::RpnEvaluator::evaluate("9 4 -") == 5,
                "rpn preserves subtraction order");
    suite.check(cppf::RpnEvaluator::evaluate("6 -3 *") == -18,
                "rpn multiplies signed operands");
    suite.check(cppf::RpnEvaluator::evaluate("-7 2 /") == -3,
                "rpn division truncates toward zero");
    suite.check(cppf::RpnEvaluator::evaluate("  2  3 + 4 *  ") == 20,
                "rpn accepts repeated ascii space separators");
    suite.check(cppf::RpnEvaluator::evaluate("+2 -3 * 8 +") == 2,
                "rpn parses explicit numeric signs");

    const long maximum = std::numeric_limits<long>::max();
    const long minimum = std::numeric_limits<long>::min();
    const unsigned long minimum_magnitude =
        static_cast<unsigned long>(maximum) + 1;

    suite.check(cppf::RpnEvaluator::evaluate(decimal(maximum)) == maximum,
                "rpn parses long maximum");
    suite.check(cppf::RpnEvaluator::evaluate(decimal(minimum)) == minimum,
                "rpn parses long minimum");
    checkOverflow(suite, unsignedDecimal(minimum_magnitude),
                  "rpn rejects positive literal above long maximum");
    checkOverflow(suite, "-" + unsignedDecimal(minimum_magnitude + 1),
                  "rpn rejects negative literal below long minimum");
    checkOverflow(suite, decimal(maximum) + " 1 +",
                  "rpn rejects addition overflow");
    checkOverflow(suite, decimal(minimum) + " 1 -",
                  "rpn rejects subtraction overflow");
    checkOverflow(suite, decimal(maximum) + " 2 *",
                  "rpn rejects multiplication overflow");
    checkOverflow(suite, decimal(minimum) + " -1 /",
                  "rpn rejects division overflow");
    suite.check(cppf::RpnEvaluator::evaluate(decimal(maximum) + " 0 +") ==
                    maximum,
                "rpn preserves maximum when adding zero");
    suite.check(cppf::RpnEvaluator::evaluate(decimal(minimum) + " 0 -") ==
                    minimum,
                "rpn preserves minimum when subtracting zero");
    checkOverflow(suite, decimal(minimum) + " -1 +",
                  "rpn rejects negative addition underflow");
    checkOverflow(suite, decimal(maximum) + " -1 -",
                  "rpn rejects negative subtraction overflow");
    suite.check(cppf::RpnEvaluator::evaluate("3 4 *") == 12 &&
                    cppf::RpnEvaluator::evaluate("3 -4 *") == -12 &&
                    cppf::RpnEvaluator::evaluate("-3 4 *") == -12 &&
                    cppf::RpnEvaluator::evaluate("-3 -4 *") == 12,
                "rpn multiplication covers every sign combination");
    suite.check(cppf::RpnEvaluator::evaluate(
                    decimal(minimum) + " 1 *") == minimum,
                "rpn multiplication reaches long minimum exactly");
    suite.check(cppf::RpnEvaluator::evaluate(decimal(minimum) + " 1 /") ==
                    minimum,
                "rpn division preserves long minimum by one");
    suite.check(cppf::RpnEvaluator::evaluate("0007") == 7 &&
                    cppf::RpnEvaluator::evaluate("+0") == 0 &&
                    cppf::RpnEvaluator::evaluate("-0") == 0,
                "rpn accepts decimal zero forms");

    checkInvalid(suite, "", "rpn rejects empty expression");
    checkInvalid(suite, "   ", "rpn rejects spaces-only expression");
    checkInvalid(suite, "1 0 /", "rpn rejects division by zero");
    checkInvalid(suite, "1 +", "rpn rejects missing operand");
    checkInvalid(suite, "1 2", "rpn rejects leftover operands");
    checkInvalid(suite, "1 2 %", "rpn rejects unknown operator");
    checkInvalid(suite, "--2", "rpn rejects malformed signed number");
    checkInvalid(suite, "2x", "rpn rejects trailing numeric bytes");
    checkInvalid(suite, "2.0", "rpn rejects decimal point");
    checkInvalid(suite, "2e1", "rpn rejects exponent syntax");
    checkInvalid(suite, "2f", "rpn rejects numeric suffix");
    checkInvalid(suite, "2\t3 +", "rpn rejects tab separator");
    checkInvalid(suite, "2 3 +\n", "rpn rejects newline separator");
    checkInvalid(suite, std::string("2\0", 2),
                 "rpn rejects embedded nul");
    checkInvalid(suite, std::string(1, static_cast<char>(0x80)),
                 "rpn rejects non-ascii byte");
}
