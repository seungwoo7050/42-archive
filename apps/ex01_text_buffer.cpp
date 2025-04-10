#include "cppf/TextBuffer.hpp"

#include <iostream>

int main(int argument_count, char **arguments)
{
    if (argument_count != 3)
    {
        std::cerr << "usage: ex01_text_buffer LEFT RIGHT" << std::endl;
        return 1;
    }
    const cppf::TextBuffer left(arguments[1]);
    const cppf::TextBuffer right(arguments[2]);
    const cppf::TextBuffer joined = left + right;

    std::cout << joined << std::endl;
    return 0;
}
