#ifndef CPPF_FORMATTER_HPP
#define CPPF_FORMATTER_HPP

#include "cppf/TextBuffer.hpp"

namespace cppf
{

class Formatter
{
public:
    virtual ~Formatter();

    virtual Formatter *clone() const = 0;
    virtual TextBuffer apply(const TextBuffer &input) const = 0;
    virtual const char *name() const = 0;
};

class UppercaseFormatter : public Formatter
{
public:
    virtual Formatter *clone() const;
    virtual TextBuffer apply(const TextBuffer &input) const;
    virtual const char *name() const;
};

class PrefixFormatter : public Formatter
{
public:
    explicit PrefixFormatter(const TextBuffer &prefix);

    virtual Formatter *clone() const;
    virtual TextBuffer apply(const TextBuffer &input) const;
    virtual const char *name() const;

private:
    TextBuffer prefix_;
};

class SuffixFormatter : public Formatter
{
public:
    explicit SuffixFormatter(const TextBuffer &suffix);

    virtual Formatter *clone() const;
    virtual TextBuffer apply(const TextBuffer &input) const;
    virtual const char *name() const;

private:
    TextBuffer suffix_;
};

}

#endif
