#ifndef CPPF_RUNTIME_TYPE_HPP
#define CPPF_RUNTIME_TYPE_HPP

namespace cppf
{

enum RuntimeKind
{
    runtime_a,
    runtime_b,
    runtime_c,
    runtime_unknown
};

class RuntimeBase
{
public:
    virtual ~RuntimeBase();

protected:
    RuntimeBase();
};

class RuntimeA : public RuntimeBase
{
};

class RuntimeB : public RuntimeBase
{
};

class RuntimeC : public RuntimeBase
{
};

class RuntimeInspector
{
public:
    static RuntimeBase *create(RuntimeKind kind);
    static RuntimeKind identify(const RuntimeBase *value);
    static RuntimeKind identify(const RuntimeBase &value);
    static const char *name(RuntimeKind kind);

private:
    RuntimeInspector();
    RuntimeInspector(const RuntimeInspector &other);
    RuntimeInspector &operator=(const RuntimeInspector &other);
};

}

#endif
