#ifndef CPPF_SERIALIZER_HPP
#define CPPF_SERIALIZER_HPP

#include <stdint.h>
#include <string>

namespace cppf
{

struct Payload
{
    Payload(unsigned long id_value, const std::string &label_value);

    unsigned long id;
    std::string label;
};

class Serializer
{
public:
    typedef uintptr_t raw_type;

    static raw_type serialize(Payload *payload);
    static Payload *deserialize(raw_type raw);

private:
    Serializer();
    Serializer(const Serializer &other);
    Serializer &operator=(const Serializer &other);
};

}

#endif
