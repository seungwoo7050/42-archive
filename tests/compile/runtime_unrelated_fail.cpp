#include "cppf/RuntimeType.hpp"

int main()
{
    int value = 0;
    return cppf::RuntimeInspector::identify(&value);
}
