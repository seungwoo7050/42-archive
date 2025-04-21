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

        if (!parseLong(token, value))
            throw std::invalid_argument("invalid rpn expression");
        stack.push_back(value);
    }
    if (stack.size() != 1)
        throw std::invalid_argument("invalid rpn expression");
    return stack.back();
}

}
