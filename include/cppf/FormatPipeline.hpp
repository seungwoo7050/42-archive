#ifndef CPPF_FORMAT_PIPELINE_HPP
#define CPPF_FORMAT_PIPELINE_HPP

#include "cppf/Formatter.hpp"

#include <cstddef>

namespace cppf
{

class FormatPipeline
{
public:
    enum
    {
        max_steps = 8
    };

    FormatPipeline();
    ~FormatPipeline();

    std::size_t size() const;
    void append(const Formatter &formatter);
    TextBuffer apply(const TextBuffer &input) const;
    void swap(FormatPipeline &other) throw();

private:
    FormatPipeline(const FormatPipeline &other);
    FormatPipeline &operator=(const FormatPipeline &other);

    Formatter *steps_[max_steps];
    std::size_t size_;
};

}

#endif
