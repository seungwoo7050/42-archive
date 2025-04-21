#include "cppf/BatchEngine.hpp"

#include "cppf/RpnEvaluator.hpp"

#include <algorithm>
#include <istream>
#include <locale>
#include <map>
#include <ostream>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace
{

bool isFieldWhitespace(char value)
{
    return value == ' ' || value == '\t' || value == '\r' ||
           value == '\n' || value == '\v' || value == '\f';
}

std::string trimField(const std::string &field)
{
    std::size_t first = 0;
    std::size_t last = field.size();

    while (first < last && isFieldWhitespace(field[first]))
        ++first;
    while (last > first && isFieldWhitespace(field[last - 1]))
        --last;
    return field.substr(first, last - first);
}

bool isNameStart(char value)
{
    return (value >= 'A' && value <= 'Z') ||
           (value >= 'a' && value <= 'z');
}

bool isNameRest(char value)
{
    return isNameStart(value) || (value >= '0' && value <= '9') ||
           value == '_' || value == '-';
}

bool isValidName(const std::string &name)
{
    std::size_t index;

    if (name.empty() || !isNameStart(name[0]))
        return false;
    for (index = 1; index < name.size(); ++index)
    {
        if (!isNameRest(name[index]))
            return false;
    }
    return true;
}

bool resultLess(const cppf::JobResult &left,
                const cppf::JobResult &right)
{
    if (left.value() != right.value())
        return left.value() < right.value();
    return left.name() < right.name();
}

void parseLine(const std::string &line,
               std::string &name,
               std::string &expression)
{
    const std::size_t separator = line.find('|');

    if (separator == std::string::npos ||
        line.find('|', separator + 1) != std::string::npos)
        throw std::invalid_argument("invalid batch input");
    name = trimField(line.substr(0, separator));
    expression = trimField(line.substr(separator + 1));
    if (!isValidName(name) || expression.empty())
        throw std::invalid_argument("invalid batch input");
}

}

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

void BatchEngine::replace(std::istream &input)
{
    std::vector<JobResult> candidate;
    std::map<std::string, long> seen;
    std::string line;

    while (std::getline(input, line))
    {
        std::string name;
        std::string expression;

        parseLine(line, name, expression);
        if (seen.find(name) != seen.end())
            throw std::invalid_argument("invalid batch input");
        const long value = RpnEvaluator::evaluate(expression);

        seen.insert(std::make_pair(name, value));
        candidate.push_back(JobResult(name, value));
    }
    if (!input.eof() || candidate.empty())
        throw std::invalid_argument("invalid batch input");
    std::sort(candidate.begin(), candidate.end(), resultLess);
    results_.swap(candidate);
}

const std::vector<JobResult> &BatchEngine::results() const
{
    return results_;
}

void BatchEngine::write(std::ostream &output) const
{
    std::ostringstream rendered;
    std::size_t index;

    rendered.imbue(std::locale::classic());
    for (index = 0; index < results_.size(); ++index)
        rendered << results_[index].value() << " | "
                 << results_[index].name() << '\n';
    const std::string text = rendered.str();

    output.write(text.data(), static_cast<std::streamsize>(text.size()));
}

}
