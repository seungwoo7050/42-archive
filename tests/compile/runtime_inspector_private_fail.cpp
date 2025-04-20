#include "cppf/RuntimeType.hpp"

int main()
{
    cppf::RuntimeInspector inspector;
    return cppf::RuntimeInspector::identify(
               static_cast<const cppf::RuntimeBase *>(0)) ==
           cppf::runtime_unknown;
}
