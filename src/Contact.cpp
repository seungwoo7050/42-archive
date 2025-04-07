#include "cppf/Contact.hpp"

namespace
{

bool validField(const std::string &value, std::size_t limit, bool allow_empty)
{
    std::string::size_type index;

    if ((!allow_empty && value.empty()) || value.size() > limit)
        return false;
    for (index = 0; index < value.size(); ++index)
    {
        const unsigned char byte = static_cast<unsigned char>(value[index]);
        if (byte < 32 || byte > 126)
            return false;
    }
    return true;
}

}

namespace cppf
{

Contact::Contact() : name_(), note_()
{
}

Contact::Contact(const std::string &name, const std::string &note)
    : name_(), note_()
{
    if (validField(name, 32, false) && validField(note, 64, true))
    {
        name_ = name;
        note_ = note;
    }
}

bool Contact::empty() const
{
    return name_.empty();
}

const std::string &Contact::name() const
{
    return name_;
}

const std::string &Contact::note() const
{
    return note_;
}

void Contact::swap(Contact &other) throw()
{
    name_.swap(other.name_);
    note_.swap(other.note_);
}

}
