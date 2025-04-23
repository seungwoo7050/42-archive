#include "cppf/BatchEngine.hpp"

int main()
{
    cppf::BatchEngine engine;
    engine.results().push_back(cppf::JobResult("value", 1));
    return 0;
}
