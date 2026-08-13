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

		std::vector<int> insert_expected;
		insert_expected.reserve(stdcopy.size() + 4);
		for (std::size_t i = 0; i < 3; ++i)
			insert_expected.push_back(stdcopy[i]);
		for (std::size_t i = 0; i < 4; ++i)
			insert_expected.push_back(stdcopy[i]);
		for (std::size_t i = 3; i < stdcopy.size(); ++i)
			insert_expected.push_back(stdcopy[i]);
		ftcopy.insert(ftcopy.begin() + 3, ftcopy.begin(), ftcopy.begin() + 4);
		stdcopy.swap(insert_expected);
		compare_vector(ftcopy, stdcopy, "self range insert");

		std::vector<int> assign_expected;
		assign_expected.reserve(stdcopy.size() - 3);
		for (std::size_t i = 2; i + 1 < stdcopy.size(); ++i)
			assign_expected.push_back(stdcopy[i]);
		ftcopy.assign(ftcopy.begin() + 2, ftcopy.end() - 1);
		stdcopy.swap(assign_expected);
		compare_vector(ftcopy, stdcopy, "self range assign");

		ft::vector<int>::reverse_iterator frit = ftcopy.rbegin();
		std::vector<int>::reverse_iterator srit = stdcopy.rbegin();
		for (; frit != ftcopy.rend() && srit != stdcopy.rend(); ++frit, ++srit)
			require(*frit == *srit, "vector reverse iteration");

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

	std::string map_value(int key)
	{
		std::ostringstream oss;
		oss << "value-" << key;
		return oss.str();
	}

	void insert_key(ft::map<int, std::string>& ftm,
		std::map<int, std::string>& stdm, int key)
	{
		ft::pair<ft::map<int, std::string>::iterator, bool> fr =
			ftm.insert(ft::make_pair(key, map_value(key)));
		std::pair<std::map<int, std::string>::iterator, bool> sr =
			stdm.insert(std::make_pair(key, map_value(key)));
		require(fr.second == sr.second, "map insert result");
		require(fr.first->first == sr.first->first, "map insert iterator key");
	}

	void check_map_queries(const ft::map<int, std::string>& ftm,
		const std::map<int, std::string>& stdm, const std::string& label)
	{
		for (int key = -3; key <= 135; key += 7)
		{
			ft::map<int, std::string>::const_iterator fit = ftm.find(key);
			std::map<int, std::string>::const_iterator sit = stdm.find(key);
			require((fit == ftm.end()) == (sit == stdm.end()),
				label + " find presence");
			if (sit != stdm.end())
				require(fit->second == sit->second, label + " find value");

			fit = ftm.lower_bound(key);
			sit = stdm.lower_bound(key);
			require((fit == ftm.end()) == (sit == stdm.end()),
				label + " lower_bound presence");
			if (sit != stdm.end())
				require(fit->first == sit->first, label + " lower_bound key");

			fit = ftm.upper_bound(key);
			sit = stdm.upper_bound(key);
			require((fit == ftm.end()) == (sit == stdm.end()),
				label + " upper_bound presence");
			if (sit != stdm.end())
				require(fit->first == sit->first, label + " upper_bound key");

			ft::pair<ft::map<int, std::string>::const_iterator,
				ft::map<int, std::string>::const_iterator> fr =
				ftm.equal_range(key);
			std::pair<std::map<int, std::string>::const_iterator,
				std::map<int, std::string>::const_iterator> sr =
				stdm.equal_range(key);
			require((fr.first == ftm.end()) == (sr.first == stdm.end()),
				label + " equal_range first presence");
			require((fr.second == ftm.end()) == (sr.second == stdm.end()),
				label + " equal_range second presence");
			if (sr.first != stdm.end())
				require(fr.first->first == sr.first->first,
					label + " equal_range first key");
			if (sr.second != stdm.end())
				require(fr.second->first == sr.second->first,
					label + " equal_range second key");
		}
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
		require(ftm.lower_bound(2)->first == stdm.lower_bound(2)->first,
			"map lower_bound gap");
		require(ftm.upper_bound(13)->first == stdm.upper_bound(13)->first,
			"map upper_bound near end");
		require(ftm.key_comp()(1, 2) == stdm.key_comp()(1, 2),
			"map key_comp");
		require(ftm.value_comp()(*ftm.begin(), *ftm.upper_bound(1))
				== stdm.value_comp()(*stdm.begin(), *stdm.upper_bound(1)),
			"map value_comp");

		ft::map<int, std::string>::reverse_iterator fmrit = ftm.rbegin();
		std::map<int, std::string>::reverse_iterator smrit = stdm.rbegin();
		for (; fmrit != ftm.rend() && smrit != stdm.rend(); ++fmrit, ++smrit)
		{
			require(fmrit->first == smrit->first, "map reverse key");
			require(fmrit->second == smrit->second, "map reverse value");
		}

		ftm.erase(3);
		stdm.erase(3);
		ftm.erase(ftm.find(10));
		stdm.erase(stdm.find(10));
		compare_map(ftm, stdm, "map erase");

		ft::map<int, std::string> ftcopy(ftm.begin(), ftm.end());
		std::map<int, std::string> stdcopy(stdm.begin(), stdm.end());
		compare_map(ftcopy, stdcopy, "map range constructor");
		require(ftcopy == ftm, "map equality");

		const ft::map<int, std::string>& ftconst = ftcopy;
		const std::map<int, std::string>& stdconst = stdcopy;
		require(ftconst.begin()->first == stdconst.begin()->first,
			"map const begin");
		require(ftconst.rbegin()->first == stdconst.rbegin()->first,
			"map const rbegin");

		ftcopy.erase(ftcopy.begin(), ftcopy.end());
		stdcopy.erase(stdcopy.begin(), stdcopy.end());
		require(ftcopy.empty() == stdcopy.empty(), "map range erase empty");
		require(ftcopy.size() == stdcopy.size(), "map range erase size");
	}

	void test_map_stress_ordering()
	{
		ft::map<int, std::string> ftasc;
		std::map<int, std::string> stdasc;
		for (int i = 1; i <= 96; ++i)
			insert_key(ftasc, stdasc, i);
		compare_map(ftasc, stdasc, "map ascending insert");
		check_map_queries(ftasc, stdasc, "map ascending queries");

		ft::map<int, std::string> ftdesc;
		std::map<int, std::string> stddesc;
		for (int i = 96; i >= 1; --i)
			insert_key(ftdesc, stddesc, i);
		compare_map(ftdesc, stddesc, "map descending insert");
		check_map_queries(ftdesc, stddesc, "map descending queries");

		ft::map<int, std::string> ftcopy(ftdesc);
		std::map<int, std::string> stdcopy(stddesc);
		compare_map(ftcopy, stdcopy, "map copy constructor stress");

		ft::map<int, std::string> ftassigned;
		std::map<int, std::string> stdassigned;
		ftassigned = ftasc;
		stdassigned = stdasc;
		compare_map(ftassigned, stdassigned, "map assignment stress");

		ftassigned.swap(ftcopy);
		stdassigned.swap(stdcopy);
		compare_map(ftassigned, stdassigned, "map member swap lhs");
		compare_map(ftcopy, stdcopy, "map member swap rhs");
	}

	void test_map_stress_erase()
	{
		ft::map<int, std::string> ftm;
		std::map<int, std::string> stdm;
		int keys[] = {
			42, 7, 88, 13, 64, 2, 91, 55, 31, 76, 19, 4, 68, 27, 83, 10,
			47, 99, 1, 35, 72, 58, 24, 90, 6, 40, 80, 15, 62, 30, 95, 50
		};
		for (std::size_t i = 0; i < sizeof(keys) / sizeof(keys[0]); ++i)
			insert_key(ftm, stdm, keys[i]);
		compare_map(ftm, stdm, "map mixed insert");
		check_map_queries(ftm, stdm, "map mixed queries");

		for (std::size_t i = 0; i < sizeof(keys) / sizeof(keys[0]); i += 3)
		{
			require(ftm.erase(keys[i]) == stdm.erase(keys[i]),
				"map erase key count");
			compare_map(ftm, stdm, "map repeated key erase");
			check_map_queries(ftm, stdm, "map repeated key erase queries");
		}

		while (!stdm.empty())
		{
			ft::map<int, std::string>::iterator fit;
			std::map<int, std::string>::iterator sit;
			if (stdm.size() % 2 == 0)
			{
				fit = ftm.begin();
				sit = stdm.begin();
			}
			else
			{
				fit = ftm.end();
				sit = stdm.end();
				--fit;
				--sit;
			}
			ftm.erase(fit);
			stdm.erase(sit);
			compare_map(ftm, stdm, "map repeated iterator erase");
		}
		require(ftm.empty() && stdm.empty(), "map erase to empty");
	}
}

int main()
{
	test_utilities();
	test_vector();
	test_stack();
	test_map();
	test_map_stress_ordering();
	test_map_stress_erase();
	std::cout << "ft_containers checks passed" << std::endl;
	return 0;
}
