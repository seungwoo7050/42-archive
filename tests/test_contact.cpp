#include "cppf/Contact.hpp"
#include "support/Test.hpp"

#include <string>

void testContact(test_support::Suite &suite)
{
    cppf::Contact empty;
    cppf::Contact contact("Ada", "analytical engine");
    const cppf::Contact &view = contact;
    cppf::Contact copy(contact);
    cppf::Contact other("Grace", "compiler");

    suite.check(empty.empty(), "contact default is empty");
    suite.check(!contact.empty(), "contact value is present");
    suite.check(view.name() == "Ada", "contact const name accessor");
    suite.check(view.note() == "analytical engine", "contact const note accessor");
    suite.check(copy.name() == contact.name(), "contact value copy name");
    suite.check(copy.note() == contact.note(), "contact value copy note");

    contact.swap(other);
    suite.check(contact.name() == "Grace", "contact swap destination");
    suite.check(other.name() == "Ada", "contact swap source");
    suite.check(cppf::Contact("", "note").empty(), "contact rejects empty name");
    suite.check(cppf::Contact(std::string(33, 'x'), "note").empty(),
                "contact rejects long name");
    suite.check(cppf::Contact("name", std::string(65, 'x')).empty(),
                "contact rejects long note");
    suite.check(cppf::Contact("bad\nname", "note").empty(),
                "contact rejects control bytes");
}
