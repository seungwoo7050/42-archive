#include "consumer_api.hpp"

#include <cstdlib>
#include <iostream>

int main()
{
	if (vector_consumer_result() != 29)
	{
		std::cerr << "FAIL: vector consumer result" << std::endl;
		return EXIT_FAILURE;
	}
	if (map_consumer_result() != 55)
	{
		std::cerr << "FAIL: map consumer result" << std::endl;
		return EXIT_FAILURE;
	}
	std::cout << "multi-translation-unit consumer checks passed" << std::endl;
	return EXIT_SUCCESS;
}
