#include "cppf/BatchEngine.hpp"

namespace cppf
{

JobResult::JobResult() : name_(), value_(0)
{
}

JobResult::JobResult(const std::string &name, long value)
    : name_(name), value_(value)
{
}

const std::string &JobResult::name() const
{
    return name_;
}

long JobResult::value() const
{
    return value_;
}

bool operator==(const JobResult &left, const JobResult &right)
{
    return left.name() == right.name() && left.value() == right.value();
}

}
