#include <cstdlib>
#include <iostream>
#include <map>
#include <sstream>
#include <stack>
#include <stdexcept>
#include <string>
#include <vector>

#include "ft_containers.hpp"

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

		std::vector<int> insert_source(stdcopy.begin(), stdcopy.begin() + 4);
		ftcopy.insert(ftcopy.begin() + 3, ftcopy.begin(), ftcopy.begin() + 4);
		stdcopy.insert(stdcopy.begin() + 3,
			insert_source.begin(), insert_source.end());
		compare_vector(ftcopy, stdcopy, "self range insert");

		std::vector<int> assign_source(stdcopy.begin() + 2, stdcopy.end() - 1);
		ftcopy.assign(ftcopy.begin() + 2, ftcopy.end() - 1);
		stdcopy.assign(assign_source.begin(), assign_source.end());
		compare_vector(ftcopy, stdcopy, "self range assign");

		bool ft_thrown = false;
		bool std_thrown = false;
		try { (void)ftv.at(ftv.size()); }
		catch (const std::out_of_range&) { ft_thrown = true; }
		try { (void)stdv.at(stdv.size()); }
		catch (const std::out_of_range&) { std_thrown = true; }
		require(ft_thrown == std_thrown, "vector at out_of_range");
	}

	void test_stack()
	{
		ft::stack<int> fts;
		std::stack<int, std::vector<int> > stds;
		for (int i = 0; i < 12; ++i)
		{
			fts.push(i);
			stds.push(i);
			require(fts.top() == stds.top(), "stack top after push");
		}
		while (!stds.empty())
		{
			require(fts.size() == stds.size(), "stack size");
			require(fts.top() == stds.top(), "stack top");
			fts.pop();
			stds.pop();
		}
		require(fts.empty() == stds.empty(), "stack empty");

		ft::stack<int> fta;
		ft::stack<int> ftb;
		std::stack<int, std::vector<int> > stda;
		std::stack<int, std::vector<int> > stdb;
		for (int i = 0; i < 4; ++i)
		{
			fta.push(i);
			ftb.push(i);
			stda.push(i);
			stdb.push(i);
		}
		ftb.push(9);
		stdb.push(9);
		require((fta == ftb) == (stda == stdb), "stack equality compare");
		require((fta < ftb) == (stda < stdb), "stack less compare");
	}

	template <class FtMap, class StdMap>
	void compare_map(const FtMap& ftm, const StdMap& stdm,
		const std::string& label)
	{
		require(ftm.size() == stdm.size(), label + " size");
		typename FtMap::const_iterator fit = ftm.begin();
		typename StdMap::const_iterator sit = stdm.begin();
		for (; fit != ftm.end() && sit != stdm.end(); ++fit, ++sit)
		{
			require(fit->first == sit->first, label + " key order");
			require(fit->second == sit->second, label + " mapped value");
		}
		require(fit == ftm.end() && sit == stdm.end(), label + " end");
	}

	void test_map()
	{
		ft::map<int, std::string> ftm;
		std::map<int, std::string> stdm;
		int keys[] = {8, 3, 10, 1, 6, 14, 4, 7, 13, 6, 8};
		for (std::size_t i = 0; i < sizeof(keys) / sizeof(keys[0]); ++i)
		{
			std::ostringstream oss;
			oss << "v" << keys[i];
			ft::pair<ft::map<int, std::string>::iterator, bool> fr =
				ftm.insert(ft::make_pair(keys[i], oss.str()));
			std::pair<std::map<int, std::string>::iterator, bool> sr =
				stdm.insert(std::make_pair(keys[i], oss.str()));
			require(fr.second == sr.second, "map duplicate insert flag");
		}
		compare_map(ftm, stdm, "map insert order");

		ftm[5] = "five";
		stdm[5] = "five";
		ftm[6] = "six";
		stdm[6] = "six";
		compare_map(ftm, stdm, "map operator[]");

		require(ftm.find(7)->second == stdm.find(7)->second, "map find");
		require(ftm.count(111) == stdm.count(111), "map count missing");
		require(ftm.lower_bound(6)->first == stdm.lower_bound(6)->first,
			"map lower_bound");
		require(ftm.upper_bound(6)->first == stdm.upper_bound(6)->first,
			"map upper_bound");
		require(ftm.equal_range(6).first->first == stdm.equal_range(6).first->first,
			"map equal_range first");

		ftm.erase(3);
		stdm.erase(3);
		ftm.erase(ftm.find(10));
		stdm.erase(stdm.find(10));
		compare_map(ftm, stdm, "map erase");

		ft::map<int, std::string> ftcopy(ftm.begin(), ftm.end());
		std::map<int, std::string> stdcopy(stdm.begin(), stdm.end());
		compare_map(ftcopy, stdcopy, "map range constructor");
		require(ftcopy == ftm, "map equality");
	}
}

int main()
{
	test_utilities();
	test_vector();
	test_stack();
	test_map();
	std::cout << "ft_containers checks passed" << std::endl;
	return 0;
}
