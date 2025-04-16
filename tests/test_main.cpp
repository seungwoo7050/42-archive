#include "support/Test.hpp"

void testContact(test_support::Suite &suite);
void testContactBook(test_support::Suite &suite);
void testTextBuffer(test_support::Suite &suite);
void testFormatter(test_support::Suite &suite);
void testFormatPipeline(test_support::Suite &suite);
void testFactory(test_support::Suite &suite);
void testScalarLiteral(test_support::Suite &suite);

int main()
{
    test_support::Suite suite;

    testContact(suite);
    testContactBook(suite);
    testTextBuffer(suite);
    testFormatter(suite);
    testFormatPipeline(suite);
    testFactory(suite);
    testScalarLiteral(suite);
    return suite.result();
}
