#include "support/Test.hpp"

void testContact(test_support::Suite &suite);
void testContactBook(test_support::Suite &suite);

int main()
{
    test_support::Suite suite;

    testContact(suite);
    testContactBook(suite);
    return suite.result();
}
