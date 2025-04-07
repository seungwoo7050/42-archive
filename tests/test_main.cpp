#include "support/Test.hpp"

void testContact(test_support::Suite &suite);

int main()
{
    test_support::Suite suite;

    testContact(suite);
    return suite.result();
}
