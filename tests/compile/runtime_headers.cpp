#include "cppf/RuntimeType.hpp"
#include "cppf/RuntimeType.hpp"

int main()
{
    cppf::RuntimeBase *value =
        cppf::RuntimeInspector::create(cppf::runtime_a);
    const cppf::RuntimeKind kind =
        cppf::RuntimeInspector::identify(value);

    delete value;
    return kind != cppf::runtime_a;
}
