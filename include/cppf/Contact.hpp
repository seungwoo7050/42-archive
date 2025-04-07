#ifndef CPPF_CONTACT_HPP
#define CPPF_CONTACT_HPP

#include <string>

namespace cppf
{

class Contact
{
public:
    Contact();
    Contact(const std::string &name, const std::string &note);

    bool empty() const;
    const std::string &name() const;
    const std::string &note() const;
    void swap(Contact &other) throw();

private:
    std::string name_;
    std::string note_;
};

}

#endif
