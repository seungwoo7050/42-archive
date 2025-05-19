#include <cstdlib>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>
#include "ft_map.hpp"
#include "support/map_inspector.hpp"

namespace
{
	const unsigned int random_seed = 0x5EED1234U;
	std::vector<std::string> operation_log;
	std::size_t current_step = 0;

	class generator
	{
	public:
		explicit generator(unsigned int seed) : _state(seed)
		{
		}

		unsigned int next()
		{
			_state = _state * 1664525U + 1013904223U;
			return _state;
		}

		int key()
		{
			return static_cast<int>(next() % 129U) - 64;
		}

	private:
		unsigned int _state;
	};

	void fail(const std::string& message)
	{
		std::cerr << "FAIL: " << message << "\nseed=" << random_seed
			<< " step=" << current_step << "\noperation prefix:" << std::endl;
		for (std::size_t i = 0; i < operation_log.size(); ++i)
			std::cerr << i << ": " << operation_log[i] << std::endl;
		std::exit(1);
	}

	void require(bool condition, const std::string& message)
	{
		if (!condition)
			fail(message);
	}

	void record(const std::string& operation)
	{
		operation_log.push_back(operation);
		current_step = operation_log.size() - 1;
	}

	void compare_maps(const ft::map<int, int>& actual,
		const std::map<int, int>& expected, const std::string& label)
	{
		require(actual.size() == expected.size(), label + " size");
		ft::map<int, int>::const_iterator actual_it = actual.begin();
		std::map<int, int>::const_iterator expected_it = expected.begin();
		while (actual_it != actual.end() && expected_it != expected.end())
		{
			require(actual_it->first == expected_it->first, label + " key");
			require(actual_it->second == expected_it->second,
				label + " mapped value");
			++actual_it;
			++expected_it;
		}
		require(actual_it == actual.end() && expected_it == expected.end(),
			label + " end");
	}

	void validate_map(const ft::map<int, int>& values,
		const std::string& label)
	{
		ft::detail::map_validation validation =
			ft::detail::map_inspector<ft::map<int, int> >::validate(values);
		require(validation.valid, label + ": " + validation.message);
	}

	void compare_query(const ft::map<int, int>& actual,
		const std::map<int, int>& expected, int key)
	{
		ft::map<int, int>::const_iterator fit = actual.find(key);
		std::map<int, int>::const_iterator sit = expected.find(key);
		require((fit == actual.end()) == (sit == expected.end()),
			"find presence");
		if (sit != expected.end())
			require(fit->second == sit->second, "find value");

		fit = actual.lower_bound(key);
		sit = expected.lower_bound(key);
		require((fit == actual.end()) == (sit == expected.end()),
			"lower_bound presence");
		if (sit != expected.end())
			require(fit->first == sit->first, "lower_bound key");

		fit = actual.upper_bound(key);
		sit = expected.upper_bound(key);
		require((fit == actual.end()) == (sit == expected.end()),
			"upper_bound presence");
		if (sit != expected.end())
			require(fit->first == sit->first, "upper_bound key");
	}

	void erase_at(ft::map<int, int>& actual, std::map<int, int>& expected,
		std::size_t index)
	{
		ft::map<int, int>::iterator fit = actual.begin();
		std::map<int, int>::iterator sit = expected.begin();
		while (index-- != 0)
		{
			++fit;
			++sit;
		}
		actual.erase(fit);
		expected.erase(sit);
	}

	void test_fixed_erasure_sequences()
	{
		const int insertion[] = {11, 2, 14, 1, 7, 15, 5, 8, 4, 13, 6, 12};
		const int erasure[] = {14, 15, 11, 2, 1, 7, 5, 8, 4, 13, 6, 12};
		ft::map<int, int> actual;
		std::map<int, int> expected;
		for (std::size_t i = 0; i < sizeof(insertion) / sizeof(insertion[0]); ++i)
		{
			std::ostringstream operation;
			operation << "fixed insert " << insertion[i];
			record(operation.str());
			actual.insert(ft::make_pair(insertion[i], insertion[i] * 10));
			expected.insert(std::make_pair(insertion[i], insertion[i] * 10));
			validate_map(actual, "fixed insert invariant");
		}
		for (std::size_t i = 0; i < sizeof(erasure) / sizeof(erasure[0]); ++i)
		{
			std::ostringstream operation;
			operation << "fixed erase " << erasure[i];
			record(operation.str());
			require(actual.erase(erasure[i]) == expected.erase(erasure[i]),
				"fixed erase count");
			compare_maps(actual, expected, "fixed erase result");
			validate_map(actual, "fixed erase invariant");
		}
	}

	void test_repeated_root_erasure()
	{
		ft::map<int, int> actual;
		std::map<int, int> expected;
		for (int key = 0; key < 96; ++key)
		{
			actual.insert(ft::make_pair(key, -key));
			expected.insert(std::make_pair(key, -key));
		}
		while (!actual.empty())
		{
			int root =
				ft::detail::map_inspector<ft::map<int, int> >::root_key(actual);
			std::ostringstream operation;
			operation << "erase current root " << root;
			record(operation.str());
			actual.erase(root);
			expected.erase(root);
			compare_maps(actual, expected, "root erase result");
			validate_map(actual, "root erase invariant");
		}
	}

	void test_randomized_differential()
	{
		generator random(random_seed);
		ft::map<int, int> actual;
		std::map<int, int> expected;
		ft::map<int, int> secondary_actual;
		std::map<int, int> secondary_expected;

		for (std::size_t step = 0; step < 3000; ++step)
		{
			const unsigned int operation = random.next() % 10U;
			const int key = random.key();
			const int value = static_cast<int>(random.next() % 2001U) - 1000;
			std::ostringstream description;
			description << "random op=" << operation << " key=" << key
				<< " value=" << value;
			record(description.str());

			if (operation == 0)
			{
				ft::pair<ft::map<int, int>::iterator, bool> fr =
					actual.insert(ft::make_pair(key, value));
				std::pair<std::map<int, int>::iterator, bool> sr =
					expected.insert(std::make_pair(key, value));
				require(fr.second == sr.second, "insert result");
				require(fr.first->first == sr.first->first, "insert iterator");
			}
			else if (operation == 1)
			{
				actual[key] = value;
				expected[key] = value;
			}
			else if (operation == 2)
				require(actual.erase(key) == expected.erase(key),
					"erase key count");
			else if (operation == 3 && !expected.empty())
				erase_at(actual, expected,
					static_cast<std::size_t>(random.next()) % expected.size());
			else if (operation == 4)
				compare_query(actual, expected, key);
			else if (operation == 5)
			{
				ft::map<int, int> copy(actual);
				std::map<int, int> expected_copy(expected);
				compare_maps(copy, expected_copy, "copy result");
				validate_map(copy, "copy invariant");
			}
			else if (operation == 6)
			{
				ft::map<int, int> assigned;
				assigned.insert(ft::make_pair(999, 999));
				assigned = actual;
				compare_maps(assigned, expected, "assignment result");
				validate_map(assigned, "assignment invariant");
			}
			else if (operation == 7)
			{
				secondary_actual[key] = value;
				secondary_expected[key] = value;
				actual.swap(secondary_actual);
				expected.swap(secondary_expected);
			}
			else if (operation == 8 && random.next() % 17U == 0)
			{
				actual.clear();
				expected.clear();
			}
			else
				compare_query(actual, expected, key);

			compare_maps(actual, expected, "random primary result");
			compare_maps(secondary_actual, secondary_expected,
				"random secondary result");
			validate_map(actual, "random primary invariant");
			validate_map(secondary_actual, "random secondary invariant");
		}
	}
}

int main()
{
	test_fixed_erasure_sequences();
	test_repeated_root_erasure();
	test_randomized_differential();
	std::cout << "map randomized checks passed" << std::endl;
	return 0;
}
