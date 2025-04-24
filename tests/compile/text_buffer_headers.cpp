#include "cppf/TextBuffer.hpp"
#include "cppf/TextBuffer.hpp"

int main()
{
    cppf::TextBuffer value("value");
    const cppf::TextBuffer &view = value;

    value.at(0) = 'V';
    return view.c_str()[0] != 'V';
}
