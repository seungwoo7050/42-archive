#ifndef CPPF_TEXT_BUFFER_HPP
#define CPPF_TEXT_BUFFER_HPP

#include <cstddef>
#include <iosfwd>

namespace cppf
{

class TextBuffer
{
public:
    TextBuffer();
    explicit TextBuffer(const char *text);
    TextBuffer(const TextBuffer &other);
    ~TextBuffer();

    TextBuffer &operator=(const TextBuffer &other);
    TextBuffer &operator+=(const TextBuffer &other);

    std::size_t size() const;
    bool empty() const;
    const char *c_str() const;
    char &at(std::size_t index);
    const char &at(std::size_t index) const;
    void swap(TextBuffer &other) throw();

private:
    char *data_;
    std::size_t size_;
};

TextBuffer operator+(const TextBuffer &left, const TextBuffer &right);
bool operator==(const TextBuffer &left, const TextBuffer &right);
bool operator!=(const TextBuffer &left, const TextBuffer &right);
bool operator<(const TextBuffer &left, const TextBuffer &right);
std::ostream &operator<<(std::ostream &output, const TextBuffer &value);

}

#endif
