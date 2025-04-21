#include "cppf/RpnEvaluator.hpp"
#include "cppf/RpnEvaluator.hpp"

int main()
{
    return cppf::RpnEvaluator::evaluate("2 3 +") != 5;
}
