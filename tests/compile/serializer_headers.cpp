#include "cppf/Serializer.hpp"
#include "cppf/Serializer.hpp"

int main()
{
    cppf::Payload payload(7, "value");
    const cppf::Serializer::raw_type raw =
        cppf::Serializer::serialize(&payload);

    return cppf::Serializer::deserialize(raw) != &payload;
}
