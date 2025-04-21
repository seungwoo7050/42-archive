#ifndef CPPF_BATCH_ENGINE_HPP
#define CPPF_BATCH_ENGINE_HPP

#include <iosfwd>
#include <string>
#include <vector>

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

class BatchEngine
{
public:
    void replace(std::istream &input);
    const std::vector<JobResult> &results() const;

private:
    std::vector<JobResult> results_;
};

}

#endif
