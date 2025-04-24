#include "cppf/TextBuffer.hpp"

int main()
{
    cppf::TextBuffer value("fixed");

    value.c_str()[0] = 'F';
    return 0;
}
