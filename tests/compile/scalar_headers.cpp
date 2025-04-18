#include "cppf/ScalarConverter.hpp"
#include "cppf/ScalarConverter.hpp"

#include <sstream>

int main()
{
    std::ostringstream output;

    cppf::ScalarConverter::write("42", output);
    return output.str().empty();
}
