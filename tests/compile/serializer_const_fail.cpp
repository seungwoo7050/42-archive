#include "cppf/Serializer.hpp"

int main()
{
    const cppf::Payload payload(7, "value");
    return cppf::Serializer::serialize(&payload) == 0;
}
