#include "cppf/TextBuffer.hpp"

#include <cstring>
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

TextBuffer::~TextBuffer()
{
    delete[] data_;
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

}
