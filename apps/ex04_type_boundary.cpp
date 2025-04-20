#include "cppf/ScalarConverter.hpp"
#include "cppf/RuntimeType.hpp"
#include "cppf/Serializer.hpp"

#include <iostream>
#include <limits>
#include <string>

namespace
{

bool parseRuntimeKind(const std::string &text, cppf::RuntimeKind &kind)
{
    if (text == "A")
        kind = cppf::runtime_a;
    else if (text == "B")
        kind = cppf::runtime_b;
    else if (text == "C")
        kind = cppf::runtime_c;
    else
        return false;
    return true;
}

bool parsePayloadId(const std::string &text, unsigned long &value)
{
    std::size_t index;

    if (text.empty())
        return false;
    value = 0;
    for (index = 0; index < text.size(); ++index)
    {
        unsigned long digit;

        if (text[index] < '0' || text[index] > '9')
            return false;
        digit = static_cast<unsigned long>(text[index] - '0');
        if (value > (std::numeric_limits<unsigned long>::max() - digit) /
                        10)
            return false;
        value = value * 10 + digit;
    }
    return true;
}

int runScalar(const char *literal)
{
    try
    {
        cppf::ScalarConverter::write(literal, std::cout);
    }
    catch (const cppf::InvalidScalar &error)
    {
        std::cerr << error.what() << std::endl;
        return 1;
    }
    return 0;
}

int runRuntime(const char *name)
{
    cppf::RuntimeKind kind;

    if (!parseRuntimeKind(name, kind))
    {
        std::cerr << "unknown runtime kind" << std::endl;
        return 1;
    }
    cppf::RuntimeBase *value = cppf::RuntimeInspector::create(kind);
    const cppf::RuntimeKind pointer_kind =
        cppf::RuntimeInspector::identify(value);
    const cppf::RuntimeKind reference_kind =
        cppf::RuntimeInspector::identify(*value);

    delete value;
    std::cout << "pointer: " << cppf::RuntimeInspector::name(pointer_kind)
              << '\n';
    std::cout << "reference: "
              << cppf::RuntimeInspector::name(reference_kind) << '\n';
    return 0;
}

int runAddress(const char *id_text, const char *label)
{
    unsigned long id;

    if (!parsePayloadId(id_text, id))
    {
        std::cerr << "invalid payload id" << std::endl;
        return 1;
    }
    cppf::Payload payload(id, label);
    const cppf::Serializer::raw_type token =
        cppf::Serializer::serialize(&payload);
    cppf::Payload *recovered = cppf::Serializer::deserialize(token);

    std::cout << "token: " << (token == 0 ? "zero" : "nonzero") << '\n';
    std::cout << "same: " << (recovered == &payload ? "yes" : "no")
              << '\n';
    std::cout << "id: " << recovered->id << '\n';
    std::cout << "label: " << recovered->label << '\n';
    return 0;
}

}

int main(int argument_count, char **arguments)
{
    if (argument_count >= 2 && std::string(arguments[1]) == "scalar")
    {
        if (argument_count != 3)
        {
            std::cerr << "usage: ex04_type_boundary scalar LITERAL"
                      << std::endl;
            return 1;
        }
        return runScalar(arguments[2]);
    }
    if (argument_count >= 2 && std::string(arguments[1]) == "runtime")
    {
        if (argument_count != 3)
        {
            std::cerr << "usage: ex04_type_boundary runtime A|B|C"
                      << std::endl;
            return 1;
        }
        return runRuntime(arguments[2]);
    }
    if (argument_count >= 2 && std::string(arguments[1]) == "address")
    {
        if (argument_count != 4)
        {
            std::cerr << "usage: ex04_type_boundary address ID LABEL"
                      << std::endl;
            return 1;
        }
        return runAddress(arguments[2], arguments[3]);
    }
    std::cerr << "usage: ex04_type_boundary MODE ..." << std::endl;
    return 1;
}
