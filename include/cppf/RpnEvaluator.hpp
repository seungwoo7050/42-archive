#ifndef CPPF_RPN_EVALUATOR_HPP
#define CPPF_RPN_EVALUATOR_HPP

#include <string>

namespace cppf
{

class RpnEvaluator
{
public:
    static long evaluate(const std::string &expression);

private:
    RpnEvaluator();
    RpnEvaluator(const RpnEvaluator &other);
    RpnEvaluator &operator=(const RpnEvaluator &other);
};

}

#endif
