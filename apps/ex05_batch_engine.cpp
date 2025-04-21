#include "cppf/BatchEngine.hpp"
#include "cppf/RpnEvaluator.hpp"

#include <exception>
#include <iostream>
#include <string>

int main(int argument_count, char **arguments)
{
    try
    {
        if (argument_count == 3 && std::string(arguments[1]) == "rpn")
        {
            const long value = cppf::RpnEvaluator::evaluate(arguments[2]);

            std::cout << value << std::endl;
            return 0;
        }
        if (argument_count == 2 && std::string(arguments[1]) == "batch")
        {
            cppf::BatchEngine engine;

            engine.replace(std::cin);
            engine.write(std::cout);
            return 0;
        }
    }
    catch (const std::exception &error)
    {
        std::cerr << error.what() << std::endl;
        return 1;
    }
    std::cerr << "usage: ex05_batch_engine rpn EXPRESSION | batch"
              << std::endl;
    return 1;
}
