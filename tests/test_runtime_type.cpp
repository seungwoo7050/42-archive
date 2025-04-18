#include "cppf/RuntimeType.hpp"
#include "support/Test.hpp"

#include <cstddef>
#include <cstring>

namespace
{

class UnknownRuntime : public cppf::RuntimeBase
{
};

class TrackedRuntime : public cppf::RuntimeBase
{
public:
    explicit TrackedRuntime(bool &destroyed) : destroyed_(destroyed)
    {
    }

    virtual ~TrackedRuntime()
    {
        destroyed_ = true;
    }

private:
    TrackedRuntime(const TrackedRuntime &other);
    TrackedRuntime &operator=(const TrackedRuntime &other);

    bool &destroyed_;
};

}

void testRuntimeType(test_support::Suite &suite)
{
    const cppf::RuntimeA value_a;
    const cppf::RuntimeB value_b;
    const cppf::RuntimeC value_c;
    const UnknownRuntime unknown;

    suite.check(cppf::RuntimeInspector::identify(&value_a) ==
                    cppf::runtime_a,
                "runtime pointer identifies A");
    suite.check(cppf::RuntimeInspector::identify(value_a) ==
                    cppf::runtime_a,
                "runtime reference identifies A");
    suite.check(cppf::RuntimeInspector::identify(&value_b) ==
                    cppf::runtime_b &&
                    cppf::RuntimeInspector::identify(value_b) ==
                    cppf::runtime_b,
                "runtime identifies B overloads");
    suite.check(cppf::RuntimeInspector::identify(&value_c) ==
                    cppf::runtime_c &&
                    cppf::RuntimeInspector::identify(value_c) ==
                    cppf::runtime_c,
                "runtime identifies C overloads");
    suite.check(cppf::RuntimeInspector::identify(
                    static_cast<const cppf::RuntimeBase *>(0)) ==
                    cppf::runtime_unknown,
                "runtime pointer identifies null as unknown");
    suite.check(cppf::RuntimeInspector::identify(&unknown) ==
                    cppf::runtime_unknown &&
                    cppf::RuntimeInspector::identify(unknown) ==
                    cppf::runtime_unknown,
                "runtime overloads reject unregistered derived type");

    const cppf::RuntimeKind kinds[] = {
        cppf::runtime_a, cppf::runtime_b, cppf::runtime_c};
    std::size_t index;
    bool created = true;

    for (index = 0; index < 3; ++index)
    {
        cppf::RuntimeBase *value =
            cppf::RuntimeInspector::create(kinds[index]);

        if (value == 0 || cppf::RuntimeInspector::identify(*value) !=
                              kinds[index])
            created = false;
        delete value;
    }
    suite.check(created, "runtime factory creates every registered type");
    suite.check(cppf::RuntimeInspector::create(cppf::runtime_unknown) == 0,
                "runtime factory rejects unknown kind");
    suite.check(std::strcmp(cppf::RuntimeInspector::name(cppf::runtime_a),
                            "A") == 0 &&
                    std::strcmp(
                        cppf::RuntimeInspector::name(cppf::runtime_unknown),
                        "unknown") == 0,
                "runtime names are stable");

    bool destroyed = false;
    cppf::RuntimeBase *tracked = new TrackedRuntime(destroyed);

    delete tracked;
    suite.check(destroyed, "runtime base deletion dispatches destructor");
}
