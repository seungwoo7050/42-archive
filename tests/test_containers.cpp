#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "ft_algorithm.hpp"
#include "ft_iterator.hpp"
#include "ft_pair.hpp"
#include "ft_type_traits.hpp"
#include "ft_vector.hpp"

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

	template <class FtVector, class StdVector>
	void compare_vector(const FtVector& ftv, const StdVector& stdv,
		const std::string& label)
	{
		require(ftv.size() == stdv.size(), label + " size");
		require(ftv.empty() == stdv.empty(), label + " empty");
		for (std::size_t i = 0; i < stdv.size(); ++i)
			require(ftv[i] == stdv[i], label + " element");
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

	void test_vector()
	{
		ft::vector<int> ftv;
		std::vector<int> stdv;
		for (int i = 0; i < 32; ++i)
		{
			ftv.push_back(i * 3 - 7);
			stdv.push_back(i * 3 - 7);
		}
		compare_vector(ftv, stdv, "push_back");

		ftv.insert(ftv.begin() + 4, 3, 42);
		stdv.insert(stdv.begin() + 4, 3, 42);
		ftv.erase(ftv.begin() + 2, ftv.begin() + 7);
		stdv.erase(stdv.begin() + 2, stdv.begin() + 7);
		ftv.resize(40, -9);
		stdv.resize(40, -9);
		ftv.reserve(96);
		stdv.reserve(96);
		compare_vector(ftv, stdv, "insert erase resize reserve");
		require(ftv.capacity() >= stdv.size(), "capacity remains usable");

		ft::vector<int> ftcopy(ftv.begin(), ftv.end());
		std::vector<int> stdcopy(stdv.begin(), stdv.end());
		compare_vector(ftcopy, stdcopy, "range constructor");
		require(ftcopy == ftv, "vector equality");
		require(!(ftcopy < ftv), "vector less equal case");

		bool ft_thrown = false;
		bool std_thrown = false;
		try { (void)ftv.at(ftv.size()); }
		catch (const std::out_of_range&) { ft_thrown = true; }
		try { (void)stdv.at(stdv.size()); }
		catch (const std::out_of_range&) { std_thrown = true; }
		require(ft_thrown == std_thrown, "vector at out_of_range");
	}
}

int main()
{
	test_utilities();
	test_vector();
	std::cout << "ft_containers checks passed" << std::endl;
	return 0;
}
