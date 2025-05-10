#include <cstdlib>
#include <iostream>
#include <string>

#include "ft_map.hpp"

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

	void test_mixed_iterator_comparisons()
	{
		ft::map<int, int> values;
		values.insert(ft::make_pair(4, 40));
		ft::map<int, int>::iterator mutable_it = values.begin();
		ft::map<int, int>::const_iterator const_it = mutable_it;
		require(mutable_it == const_it,
			"iterator compares equal to const_iterator");
		require(const_it == mutable_it,
			"const_iterator compares equal to iterator");
		require(!(mutable_it != const_it),
			"iterator mixed inequality is symmetric");
		require(!(const_it != mutable_it),
			"const_iterator mixed inequality is symmetric");
	}
}

int main()
{
	test_mixed_iterator_comparisons();
	std::cout << "map iterator checks passed" << std::endl;
	return 0;
}
