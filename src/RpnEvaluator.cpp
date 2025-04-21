#include "cppf/RpnEvaluator.hpp"

#include <limits>
#include <stdexcept>
#include <vector>

namespace
{

bool isDigit(char value)
{
    return value >= '0' && value <= '9';
}

bool parseLong(const std::string &token, long &value)
{
    std::size_t index = 0;
    bool negative = false;
    unsigned long magnitude = 0;
    unsigned long limit;

    if (token.empty())
        return false;
    if (token[index] == '+' || token[index] == '-')
    {
        negative = token[index] == '-';
        ++index;
    }
    if (index == token.size())
        return false;
    limit = static_cast<unsigned long>(std::numeric_limits<long>::max());
    if (negative)
        ++limit;
    while (index < token.size())
    {
        unsigned long digit;

        if (!isDigit(token[index]))
            return false;
        digit = static_cast<unsigned long>(token[index] - '0');
        if (magnitude > (limit - digit) / 10)
            throw std::overflow_error("rpn overflow");
        magnitude = magnitude * 10 + digit;
        ++index;
    }
    if (!negative)
        value = static_cast<long>(magnitude);
    else if (magnitude == limit)
        value = std::numeric_limits<long>::min();
    else
        value = -static_cast<long>(magnitude);
    return true;
}

unsigned long magnitudeOf(long value)
{
    if (value >= 0)
        return static_cast<unsigned long>(value);
    return static_cast<unsigned long>(-(value + 1)) + 1;
}

long checkedAdd(long left, long right)
{
    if ((right > 0 &&
         left > std::numeric_limits<long>::max() - right) ||
        (right < 0 &&
         left < std::numeric_limits<long>::min() - right))
        throw std::overflow_error("rpn overflow");
    return left + right;
}

long checkedSubtract(long left, long right)
{
    if ((right > 0 &&
         left < std::numeric_limits<long>::min() + right) ||
        (right < 0 &&
         left > std::numeric_limits<long>::max() + right))
        throw std::overflow_error("rpn overflow");
    return left - right;
}

long checkedMultiply(long left, long right)
{
    const bool negative = (left < 0) != (right < 0);
    const unsigned long left_magnitude = magnitudeOf(left);
    const unsigned long right_magnitude = magnitudeOf(right);
    unsigned long limit =
        static_cast<unsigned long>(std::numeric_limits<long>::max());
    unsigned long product;

    if (left_magnitude == 0 || right_magnitude == 0)
        return 0;
    if (negative)
        ++limit;
    if (left_magnitude > limit / right_magnitude)
        throw std::overflow_error("rpn overflow");
    product = left_magnitude * right_magnitude;
    if (!negative)
        return static_cast<long>(product);
    if (product == limit)
        return std::numeric_limits<long>::min();
    return -static_cast<long>(product);
}

long checkedDivide(long left, long right)
{
    if (right == 0)
        throw std::invalid_argument("invalid rpn expression");
    if (left == std::numeric_limits<long>::min() && right == -1)
        throw std::overflow_error("rpn overflow");
    return left / right;
}

long applyOperator(long left, long right, char operation)
{
    if (operation == '+')
        return checkedAdd(left, right);
    if (operation == '-')
        return checkedSubtract(left, right);
    if (operation == '*')
        return checkedMultiply(left, right);
    return checkedDivide(left, right);
}

bool isOperator(const std::string &token)
{
    return token.size() == 1 &&
           (token[0] == '+' || token[0] == '-' || token[0] == '*' ||
            token[0] == '/');
}

}

namespace cppf
{

long RpnEvaluator::evaluate(const std::string &expression)
{
    std::vector<long> stack;
    std::size_t index = 0;

    while (index < expression.size())
    {
        std::size_t start;
        long value;

        while (index < expression.size() && expression[index] == ' ')
            ++index;
        if (index == expression.size())
            break;
        start = index;
        while (index < expression.size() && expression[index] != ' ')
            ++index;
        const std::string token = expression.substr(start, index - start);

        if (isOperator(token))
        {
            long right;
            long left;

            if (stack.size() < 2)
                throw std::invalid_argument("invalid rpn expression");
            right = stack.back();
            stack.pop_back();
            left = stack.back();
            stack.pop_back();
            stack.push_back(applyOperator(left, right, token[0]));
        }
        else if (parseLong(token, value))
            stack.push_back(value);
        else
            throw std::invalid_argument("invalid rpn expression");
    }
    if (stack.size() != 1)
        throw std::invalid_argument("invalid rpn expression");
    return stack.back();
}

}
