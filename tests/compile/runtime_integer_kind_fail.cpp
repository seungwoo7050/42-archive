#include "cppf/RuntimeType.hpp"

int main()
{
    cppf::RuntimeBase *value = cppf::RuntimeInspector::create(999);

    delete value;
    return 0;
}
