#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include "ft_map.hpp"
#include "support/map_inspector.hpp"

namespace
{
	class counting_less
	{
	public:
		explicit counting_less(std::size_t* comparisons = NULL)
			: _comparisons(comparisons)
		{
		}

		bool operator()(int lhs, int rhs) const
		{
			if (_comparisons != NULL)
				++(*_comparisons);
			return lhs < rhs;
		}

	private:
		std::size_t* _comparisons;
	};

	typedef ft::map<int, int, counting_less> measured_map;

	void require(bool condition, const std::string& message)
	{
		if (!condition)
		{
			std::cerr << "FAIL: " << message << std::endl;
			std::exit(1);
		}
	}

	std::size_t ceil_log2(std::size_t value)
	{
		std::size_t exponent = 0;
		std::size_t power = 1;
		while (power < value)
		{
			power *= 2;
			++exponent;
		}
		return exponent;
	}

	void make_ascending(std::vector<int>& keys)
	{
		for (std::size_t i = 0; i < keys.size(); ++i)
			keys[i] = static_cast<int>(i);
	}

	void make_descending(std::vector<int>& keys)
	{
		for (std::size_t i = 0; i < keys.size(); ++i)
			keys[i] = static_cast<int>(keys.size() - i - 1);
	}

	void make_fixed_random(std::vector<int>& keys)
	{
		make_ascending(keys);
		unsigned int state = 0xC0FFEE11U;
		for (std::size_t i = keys.size(); i > 1; --i)
		{
			state = state * 1664525U + 1013904223U;
			const std::size_t other = state % i;
			const int tmp = keys[i - 1];
			keys[i - 1] = keys[other];
			keys[other] = tmp;
		}
	}

	void check_scenario(const std::string& label,
		const std::vector<int>& insertion_order)
	{
		std::size_t comparisons = 0;
		measured_map values((counting_less(&comparisons)));
		for (std::size_t i = 0; i < insertion_order.size(); ++i)
			values.insert(ft::make_pair(insertion_order[i],
				insertion_order[i] * 3));
		const std::size_t insertion_comparisons = comparisons;

		ft::detail::map_validation validation =
			ft::detail::map_inspector<measured_map>::validate(values);
		require(validation.valid, label + " invariant: " + validation.message);
		const std::size_t logarithm = ceil_log2(values.size() + 1);
		const std::size_t height_limit = 2 * logarithm;
		require(validation.height <= height_limit,
			label + " red-black height limit");
		const std::size_t insertion_limit =
			values.size() * (4 * logarithm + 4);
		require(insertion_comparisons <= insertion_limit,
			label + " insertion comparison limit");

		std::size_t maximum_find_comparisons = 0;
		for (std::size_t i = 0; i < insertion_order.size(); ++i)
		{
			comparisons = 0;
			measured_map::const_iterator found =
				values.find(insertion_order[i]);
			require(found != values.end(), label + " find existing key");
			if (comparisons > maximum_find_comparisons)
				maximum_find_comparisons = comparisons;
			require(comparisons <= 2 * validation.height + 2,
				label + " find comparison limit");
		}
		const int missing_keys[] = {-1,
			static_cast<int>(insertion_order.size())};
		for (std::size_t i = 0; i < 2; ++i)
		{
			comparisons = 0;
			require(values.find(missing_keys[i]) == values.end(),
				label + " find missing key");
			if (comparisons > maximum_find_comparisons)
				maximum_find_comparisons = comparisons;
			require(comparisons <= 2 * validation.height + 2,
				label + " missing find comparison limit");
		}

		std::cout << label << ": nodes=" << values.size()
			<< " height=" << validation.height
			<< " insert_comparisons=" << insertion_comparisons
			<< " max_find_comparisons=" << maximum_find_comparisons
			<< std::endl;
	}
}

int main()
{
	const std::size_t node_count = 1024;
	std::vector<int> keys(node_count);
	make_ascending(keys);
	check_scenario("ascending", keys);
	make_descending(keys);
	check_scenario("descending", keys);
	make_fixed_random(keys);
	check_scenario("fixed-random", keys);
	std::cout << "complexity checks passed" << std::endl;
	return 0;
}
