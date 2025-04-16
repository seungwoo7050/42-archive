#ifndef CPP_FOUNDATION_SCALAR_LITERAL_HPP
#define CPP_FOUNDATION_SCALAR_LITERAL_HPP

#include <string>

namespace cppf
{
namespace scalar_detail
{

enum LiteralKind
{
    literal_character,
    literal_finite,
    literal_nan,
    literal_positive_infinity,
    literal_negative_infinity
};

struct ScalarLiteral
{
    LiteralKind kind;
    double value;
    bool float_suffix;
    bool negative_zero;
};

class ScalarParseError
{
};

ScalarLiteral parseScalarLiteral(const std::string &text);

}
}

#endif
