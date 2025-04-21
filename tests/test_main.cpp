#include "support/Test.hpp"

void testContact(test_support::Suite &suite);
void testContactBook(test_support::Suite &suite);
void testTextBuffer(test_support::Suite &suite);
void testFormatter(test_support::Suite &suite);
void testFormatPipeline(test_support::Suite &suite);
void testFactory(test_support::Suite &suite);
void testScalarLiteral(test_support::Suite &suite);
void testScalarConverter(test_support::Suite &suite);
void testRuntimeType(test_support::Suite &suite);
void testSerializer(test_support::Suite &suite);
void testRandomAccessBatch(test_support::Suite &suite);
void testRpnEvaluator(test_support::Suite &suite);
void testBatchEngine(test_support::Suite &suite);

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
    testScalarConverter(suite);
    testRuntimeType(suite);
    testSerializer(suite);
    testRandomAccessBatch(suite);
    testRpnEvaluator(suite);
    testBatchEngine(suite);
    return suite.result();
}
