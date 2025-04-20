#include "cppf/Serializer.hpp"

namespace cppf
{

Payload::Payload(unsigned long id_value, const std::string &label_value)
    : id(id_value), label(label_value)
{
}

Serializer::raw_type Serializer::serialize(Payload *payload)
{
    if (payload == 0)
        return static_cast<raw_type>(0);
    return reinterpret_cast<raw_type>(payload);
}

Payload *Serializer::deserialize(raw_type raw)
{
    if (raw == static_cast<raw_type>(0))
        return 0;
    return reinterpret_cast<Payload *>(raw);
}

}
