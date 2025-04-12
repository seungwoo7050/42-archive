#include "support/Test.hpp"

void testContact(test_support::Suite &suite);
void testContactBook(test_support::Suite &suite);
void testTextBuffer(test_support::Suite &suite);
void testFormatter(test_support::Suite &suite);

int main()
{
    test_support::Suite suite;

    testContact(suite);
    testContactBook(suite);
    testTextBuffer(suite);
    testFormatter(suite);
    return suite.result();
}
