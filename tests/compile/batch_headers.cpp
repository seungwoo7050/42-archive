#include "cppf/BatchEngine.hpp"
#include "cppf/BatchEngine.hpp"

#include <sstream>

int main()
{
    std::istringstream input("alpha | 2 3 +\n");
    cppf::BatchEngine engine;

    engine.replace(input);
    return engine.results().at(0).value() != 5;
}
