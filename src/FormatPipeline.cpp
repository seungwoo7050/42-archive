#include "cppf/FormatPipeline.hpp"

#include <stdexcept>

namespace cppf
{

FormatPipeline::FormatPipeline() : steps_(), size_(0)
{
    std::size_t index;

    for (index = 0; index < max_steps; ++index)
        steps_[index] = 0;
}

FormatPipeline::FormatPipeline(const FormatPipeline &other) : steps_(), size_(0)
{
    std::size_t index;

    for (index = 0; index < max_steps; ++index)
        steps_[index] = 0;
    try
    {
        for (index = 0; index < other.size_; ++index)
            append(*other.steps_[index]);
    }
    catch (...)
    {
        for (index = 0; index < size_; ++index)
            delete steps_[index];
        throw;
    }
}

FormatPipeline::~FormatPipeline()
{
    std::size_t index;

    for (index = 0; index < size_; ++index)
        delete steps_[index];
}

FormatPipeline &FormatPipeline::operator=(const FormatPipeline &other)
{
    FormatPipeline copy(other);

    swap(copy);
    return *this;
}

std::size_t FormatPipeline::size() const
{
    return size_;
}

void FormatPipeline::append(const Formatter &formatter)
{
    Formatter *copy;

    if (size_ == max_steps)
        throw std::length_error("pipeline capacity");
    copy = formatter.clone();
    steps_[size_] = copy;
    ++size_;
}

TextBuffer FormatPipeline::apply(const TextBuffer &input) const
{
    TextBuffer result(input);
    std::size_t index;

    for (index = 0; index < size_; ++index)
        result = steps_[index]->apply(result);
    return result;
}

void FormatPipeline::swap(FormatPipeline &other) throw()
{
    std::size_t index;
    const std::size_t size = size_;

    for (index = 0; index < max_steps; ++index)
    {
        Formatter *step = steps_[index];
        steps_[index] = other.steps_[index];
        other.steps_[index] = step;
    }
    size_ = other.size_;
    other.size_ = size;
}

}
