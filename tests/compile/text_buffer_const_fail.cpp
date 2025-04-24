#include "cppf/TextBuffer.hpp"

int main()
{
    const cppf::TextBuffer value("fixed");

    value.at(0) = 'F';
    return 0;
}
