#include "cppf/TextBuffer.hpp"

#include <cstring>
#include <limits>
#include <ostream>
#include <stdexcept>

namespace cppf
{

TextBuffer::TextBuffer() : data_(new char[1]), size_(0)
{
    data_[0] = '\0';
}

TextBuffer::TextBuffer(const char *text) : data_(0), size_(0)
{
    if (text == 0)
        text = "";
    size_ = std::strlen(text);
    data_ = new char[size_ + 1];
    std::memcpy(data_, text, size_ + 1);
}

TextBuffer::TextBuffer(const TextBuffer &other)
    : data_(new char[other.size_ + 1]), size_(other.size_)
{
    std::memcpy(data_, other.data_, size_ + 1);
}

TextBuffer::~TextBuffer()
{
    delete[] data_;
}

TextBuffer &TextBuffer::operator=(const TextBuffer &other)
{
    TextBuffer copy(other);

    swap(copy);
    return *this;
}

TextBuffer &TextBuffer::operator+=(const TextBuffer &other)
{
    char *joined;
    std::size_t joined_size;

    if (other.size_ > std::numeric_limits<std::size_t>::max() - size_ - 1)
        throw std::length_error("text length");
    joined_size = size_ + other.size_;
    joined = new char[joined_size + 1];
    std::memcpy(joined, data_, size_);
    std::memcpy(joined + size_, other.data_, other.size_ + 1);
    delete[] data_;
    data_ = joined;
    size_ = joined_size;
    return *this;
}

std::size_t TextBuffer::size() const
{
    return size_;
}

bool TextBuffer::empty() const
{
    return size_ == 0;
}

const char *TextBuffer::c_str() const
{
    return data_;
}

char &TextBuffer::at(std::size_t index)
{
    if (index >= size_)
        throw std::out_of_range("text index");
    return data_[index];
}

const char &TextBuffer::at(std::size_t index) const
{
    if (index >= size_)
        throw std::out_of_range("text index");
    return data_[index];
}

void TextBuffer::swap(TextBuffer &other) throw()
{
    char *data = data_;
    const std::size_t size = size_;

    data_ = other.data_;
    size_ = other.size_;
    other.data_ = data;
    other.size_ = size;
}

TextBuffer operator+(const TextBuffer &left, const TextBuffer &right)
{
    TextBuffer result(left);

    result += right;
    return result;
}

bool operator==(const TextBuffer &left, const TextBuffer &right)
{
    return std::strcmp(left.c_str(), right.c_str()) == 0;
}

bool operator!=(const TextBuffer &left, const TextBuffer &right)
{
    return !(left == right);
}

bool operator<(const TextBuffer &left, const TextBuffer &right)
{
    return std::strcmp(left.c_str(), right.c_str()) < 0;
}

std::ostream &operator<<(std::ostream &output, const TextBuffer &value)
{
    return output << value.c_str();
}

}
