#include "cppf/ScalarConverter.hpp"

#include <iostream>

int main(int argument_count, char **arguments)
{
    if (argument_count != 3 || std::string(arguments[1]) != "scalar")
    {
        std::cerr << "usage: ex04_type_boundary scalar LITERAL" << std::endl;
        return 1;
    }
    try
    {
        cppf::ScalarConverter::write(arguments[2], std::cout);
    }
    catch (const cppf::InvalidScalar &error)
    {
        std::cerr << error.what() << std::endl;
        return 1;
    }
    return 0;
}
