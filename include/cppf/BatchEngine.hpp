#ifndef CPPF_BATCH_ENGINE_HPP
#define CPPF_BATCH_ENGINE_HPP

#include <string>

namespace cppf
{

class JobResult
{
public:
    JobResult();
    JobResult(const std::string &name, long value);

    const std::string &name() const;
    long value() const;

private:
    std::string name_;
    long value_;
};

bool operator==(const JobResult &left, const JobResult &right);

}

#endif
