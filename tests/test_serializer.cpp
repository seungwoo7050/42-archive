#include "cppf/Serializer.hpp"
#include "support/Test.hpp"

void testSerializer(test_support::Suite &suite)
{
    cppf::Payload first(42, "alpha");
    cppf::Payload second(7, "beta");

    suite.check(first.id == 42 && first.label == "alpha",
                "payload constructor preserves fields");
    suite.check(sizeof(cppf::Serializer::raw_type) >=
                    sizeof(cppf::Payload *),
                "address token is wide enough for payload pointer");

    const cppf::Serializer::raw_type first_raw =
        cppf::Serializer::serialize(&first);
    const cppf::Serializer::raw_type second_raw =
        cppf::Serializer::serialize(&second);
    cppf::Payload *recovered = cppf::Serializer::deserialize(first_raw);

    suite.check(first_raw != 0 && recovered == &first,
                "serializer preserves stack pointer identity");
    recovered->label = "changed";
    suite.check(first.label == "changed",
                "deserialized pointer aliases the live payload");
    suite.check(first_raw != second_raw &&
                    cppf::Serializer::deserialize(second_raw) == &second,
                "serializer distinguishes simultaneous live payloads");

    cppf::Payload *heap = new cppf::Payload(99, "heap");
    const cppf::Serializer::raw_type heap_raw =
        cppf::Serializer::serialize(heap);
    cppf::Payload *heap_recovered =
        cppf::Serializer::deserialize(heap_raw);

    suite.check(heap_recovered == heap && heap_recovered->id == 99,
                "serializer round-trips heap payload during its lifetime");
    delete heap;

    suite.check(cppf::Serializer::serialize(0) == 0 &&
                    cppf::Serializer::deserialize(0) == 0,
                "serializer preserves null token");

    cppf::Serializer::raw_type expired;
    {
        cppf::Payload scoped(5, "scoped");

        expired = cppf::Serializer::serialize(&scoped);
        suite.check(cppf::Serializer::deserialize(expired) == &scoped,
                    "address token is valid inside payload lifetime");
    }
    suite.check(expired != 0,
                "expired token remains opaque and is not dereferenced");
}
