#include "cppf/RuntimeType.hpp"

#include <typeinfo>

namespace cppf
{

RuntimeBase::RuntimeBase()
{
}

RuntimeBase::~RuntimeBase()
{
}

RuntimeBase *RuntimeInspector::create(RuntimeKind kind)
{
    if (kind == runtime_a)
        return new RuntimeA();
    if (kind == runtime_b)
        return new RuntimeB();
    if (kind == runtime_c)
        return new RuntimeC();
    return 0;
}

RuntimeKind RuntimeInspector::identify(const RuntimeBase *value)
{
    if (dynamic_cast<const RuntimeA *>(value) != 0)
        return runtime_a;
    if (dynamic_cast<const RuntimeB *>(value) != 0)
        return runtime_b;
    if (dynamic_cast<const RuntimeC *>(value) != 0)
        return runtime_c;
    return runtime_unknown;
}

RuntimeKind RuntimeInspector::identify(const RuntimeBase &value)
{
    try
    {
        const RuntimeA &matched = dynamic_cast<const RuntimeA &>(value);
        static_cast<void>(matched);
        return runtime_a;
    }
    catch (const std::bad_cast &)
    {
    }
    try
    {
        const RuntimeB &matched = dynamic_cast<const RuntimeB &>(value);
        static_cast<void>(matched);
        return runtime_b;
    }
    catch (const std::bad_cast &)
    {
    }
    try
    {
        const RuntimeC &matched = dynamic_cast<const RuntimeC &>(value);
        static_cast<void>(matched);
        return runtime_c;
    }
    catch (const std::bad_cast &)
    {
    }
    return runtime_unknown;
}

const char *RuntimeInspector::name(RuntimeKind kind)
{
    if (kind == runtime_a)
        return "A";
    if (kind == runtime_b)
        return "B";
    if (kind == runtime_c)
        return "C";
    return "unknown";
}

}
