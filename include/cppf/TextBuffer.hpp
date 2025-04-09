#ifndef CPPF_TEXT_BUFFER_HPP
#define CPPF_TEXT_BUFFER_HPP

#include <cstddef>

namespace cppf
{

class TextBuffer
{
public:
    TextBuffer();
    explicit TextBuffer(const char *text);
    ~TextBuffer();

    std::size_t size() const;
    bool empty() const;
    const char *c_str() const;
    char &at(std::size_t index);
    const char &at(std::size_t index) const;
    void swap(TextBuffer &other) throw();

private:
    TextBuffer(const TextBuffer &other);
    TextBuffer &operator=(const TextBuffer &other);

    char *data_;
    std::size_t size_;
};

}

#endif
