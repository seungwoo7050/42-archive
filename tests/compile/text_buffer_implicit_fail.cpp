#include "cppf/TextBuffer.hpp"

void consume(const cppf::TextBuffer &value)
{
    (void)value;
}

int main()
{
    consume("implicit");
    return 0;
}
