#include <cstdlib>
#include <iostream>
#include <string>

#include "ft_algorithm.hpp"
#include "ft_iterator.hpp"
#include "ft_pair.hpp"
#include "ft_type_traits.hpp"

namespace
{
	void require(bool condition, const std::string& message)
	{
		if (!condition)
		{
			std::cerr << "FAIL: " << message << std::endl;
			std::exit(1);
		}
	}

	void test_utilities()
	{
		ft::pair<int, std::string> p = ft::make_pair(3, std::string("three"));
		require(p.first == 3 && p.second == "three", "make_pair value");
		require(ft::is_integral<int>::value, "is_integral int");
		require(!ft::is_integral<std::string>::value, "is_integral string");

		int a[] = {1, 2, 3};
		int b[] = {1, 2, 4};
		require(ft::equal(a, a + 2, b), "equal prefix");
		require(ft::lexicographical_compare(a, a + 3, b, b + 3),
			"lexicographical_compare arrays");

		ft::reverse_iterator<int*> reverse(a + 3);
		require(*reverse == 3, "reverse_iterator dereference");
		require(ft::iterator_traits<int*>::difference_type(3) == 3,
			"iterator_traits difference type");
	}
}

int main()
{
	test_utilities();
	std::cout << "ft_containers checks passed" << std::endl;
	return 0;
}
