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

	void test_saved_end_after_rotation()
	{
		ft::map<int, int> values;
		values.insert(ft::make_pair(1, 10));
		ft::map<int, int>::iterator saved_end = values.end();
		values.insert(ft::make_pair(2, 20));
		values.insert(ft::make_pair(3, 30));
		--saved_end;
		require(saved_end->first == 3,
			"saved end follows the current maximum after rotation");
	}

	void test_saved_end_after_root_erasure()
	{
		ft::map<int, int> values;
		values.insert(ft::make_pair(2, 20));
		values.insert(ft::make_pair(1, 10));
		values.insert(ft::make_pair(3, 30));
		ft::map<int, int>::iterator saved_end = values.end();
		values.erase(2);
		--saved_end;
		require(saved_end->first == 3,
			"saved end does not retain the erased root");

		values.erase(3);
		saved_end = values.end();
		--saved_end;
		require(saved_end->first == 1,
			"end follows the maximum after repeated erasure");
		values.clear();
		require(values.begin() == values.end(),
			"empty map restores the header links");
	}

	void test_element_iterator_survives_rotation()
	{
		ft::map<int, int> values;
		ft::map<int, int>::iterator one =
			values.insert(ft::make_pair(1, 10)).first;
		values.insert(ft::make_pair(2, 20));
		values.insert(ft::make_pair(3, 30));
		require(one->first == 1, "element iterator keeps its node");
		++one;
		require(one->first == 2,
			"element iterator follows rebalanced parent links");
		++one;
		require(one->first == 3, "element iterator reaches maximum");
		++one;
		require(one == values.end(), "element iterator reaches header end");
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

	void test_iterators_across_swap()
	{
		ft::map<int, int> left;
		ft::map<int, int> right;
		left.insert(ft::make_pair(1, 10));
		left.insert(ft::make_pair(2, 20));
		right.insert(ft::make_pair(8, 80));
		ft::map<int, int>::iterator left_max = left.find(2);
		ft::map<int, int>::iterator right_value = right.find(8);
		left.swap(right);

		require(left_max->first == 2, "swap preserves left element iterator");
		++left_max;
		require(left_max == right.end(),
			"left element iterator reaches its new container end");
		require(right_value->first == 8,
			"swap preserves right element iterator");
		++right_value;
		require(right_value == left.end(),
			"right element iterator reaches its new container end");
	}

	class key_without_default
	{
	public:
		explicit key_without_default(int number) : value(number)
		{
		}

		int value;

	private:
		key_without_default();
	};

	struct key_less
	{
		bool operator()(const key_without_default& lhs,
			const key_without_default& rhs) const
		{
			return lhs.value < rhs.value;
		}
	};

	void test_header_does_not_hold_a_value()
	{
		ft::map<key_without_default, int, key_less> values;
		require(values.begin() == values.end(),
			"empty header does not require a default key");
		values.insert(ft::make_pair(key_without_default(5), 50));
		require(values.begin()->first.value == 5,
			"non-default key inserts normally");
	}
}

int main()
{
	test_saved_end_after_rotation();
	test_saved_end_after_root_erasure();
	test_element_iterator_survives_rotation();
	test_mixed_iterator_comparisons();
	test_iterators_across_swap();
	test_header_does_not_hold_a_value();
	std::cout << "map iterator checks passed" << std::endl;
	return 0;
}
