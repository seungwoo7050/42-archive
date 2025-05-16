#include <cstdlib>
#include <iostream>
#include <memory>
#include <new>
#include <stdexcept>
#include <string>
#include "ft_map.hpp"

namespace
{
	class injected_failure : public std::exception
	{
	public:
		const char* what() const throw()
		{
			return "injected map failure";
		}
	};

	struct comparison_state
	{
		int calls;
		int throw_on_call;

		comparison_state() : calls(0), throw_on_call(-1)
		{
		}

		void reset()
		{
			calls = 0;
			throw_on_call = -1;
		}
	};

	class throwing_less
	{
	public:
		explicit throwing_less(comparison_state* state = NULL) : _state(state)
		{
		}

		bool operator()(int lhs, int rhs) const
		{
			if (_state != NULL
				&& _state->calls++ == _state->throw_on_call)
				throw injected_failure();
			return lhs < rhs;
		}

	private:
		comparison_state* _state;
	};

	struct allocation_state
	{
		int outstanding_blocks;
		int allocation_calls;
		int throw_on_call;

		allocation_state()
			: outstanding_blocks(0), allocation_calls(0), throw_on_call(-1)
		{
		}

		void reset_failure()
		{
			allocation_calls = 0;
			throw_on_call = -1;
		}
	};

	template <class T>
	class tracking_allocator
	{
	public:
		typedef T value_type;
		typedef T* pointer;
		typedef const T* const_pointer;
		typedef T& reference;
		typedef const T& const_reference;
		typedef std::size_t size_type;
		typedef std::ptrdiff_t difference_type;

		template <class U>
		struct rebind
		{
			typedef tracking_allocator<U> other;
		};

		explicit tracking_allocator(allocation_state* state = NULL)
			: _state(state)
		{
		}

		template <class U>
		tracking_allocator(const tracking_allocator<U>& other)
			: _state(other.state())
		{
		}

		pointer allocate(size_type count, const void* = 0)
		{
			if (_state != NULL
				&& _state->allocation_calls++ == _state->throw_on_call)
				throw std::bad_alloc();
			pointer result = std::allocator<T>().allocate(count);
			if (_state != NULL)
				++_state->outstanding_blocks;
			return result;
		}

		void deallocate(pointer data, size_type count)
		{
			std::allocator<T>().deallocate(data, count);
			if (_state != NULL)
				--_state->outstanding_blocks;
		}

		void construct(pointer place, const_reference value)
		{
			::new (static_cast<void*>(place)) T(value);
		}

		void destroy(pointer place)
		{
			place->~T();
		}

		size_type max_size() const
		{
			return std::allocator<T>().max_size();
		}

		allocation_state* state() const
		{
			return _state;
		}

	private:
		allocation_state* _state;
	};

	template <class T, class U>
	bool operator==(const tracking_allocator<T>& lhs,
		const tracking_allocator<U>& rhs)
	{
		return lhs.state() == rhs.state();
	}

	template <class T, class U>
	bool operator!=(const tracking_allocator<T>& lhs,
		const tracking_allocator<U>& rhs)
	{
		return !(lhs == rhs);
	}

	typedef ft::pair<const int, int> map_value;
	typedef tracking_allocator<map_value> map_allocator;
	typedef ft::map<int, int, throwing_less, map_allocator> tested_map;

	class generated_iterator
	{
	public:
		generated_iterator(const int* keys, std::size_t index)
			: _keys(keys), _index(index)
		{
		}

		map_value operator*() const
		{
			return map_value(_keys[_index], _keys[_index] * 10);
		}

		generated_iterator& operator++()
		{
			++_index;
			return *this;
		}

		bool operator==(const generated_iterator& other) const
		{
			return _keys == other._keys && _index == other._index;
		}

		bool operator!=(const generated_iterator& other) const
		{
			return !(*this == other);
		}

	private:
		const int* _keys;
		std::size_t _index;
	};

	void require(bool condition, const std::string& message)
	{
		if (!condition)
		{
			std::cerr << "FAIL: " << message << std::endl;
			std::exit(1);
		}
	}

	void require_keys(const tested_map& values, const int* expected,
		std::size_t count, const std::string& label)
	{
		require(values.size() == count, label + " size");
		tested_map::const_iterator it = values.begin();
		for (std::size_t i = 0; i < count; ++i, ++it)
		{
			require(it != values.end(), label + " early end");
			require(it->first == expected[i], label + " key");
		}
		require(it == values.end(), label + " final end");
	}

	void test_insert_does_not_compare_after_allocation()
	{
		for (int fail_at = 0; fail_at < 5; ++fail_at)
		{
			comparison_state comparisons;
			allocation_state allocations;
			{
				tested_map values((throwing_less(&comparisons)),
					map_allocator(&allocations));
				values.insert(map_value(10, 100));
				comparisons.calls = 0;
				comparisons.throw_on_call = fail_at;
				bool thrown = false;
				try
				{
					values.insert(map_value(15, 150));
				}
				catch (const injected_failure&)
				{
					thrown = true;
				}
				comparisons.reset();
				if (thrown)
				{
					const int expected[] = {10};
					require_keys(values, expected, 1,
						"failed insert preserves tree");
				}
				else
				{
					const int expected[] = {10, 15};
					require_keys(values, expected, 2,
						"successful insert");
				}
				require(allocations.outstanding_blocks
						== static_cast<int>(values.size()),
					"insert owns every allocated node");
			}
			require(allocations.outstanding_blocks == 0,
				"insert releases all nodes");
		}
	}

	void test_range_constructor_rollback()
	{
		const int keys[] = {1, 2, 3, 4, 5, 6};
		for (int fail_at = 0; fail_at < 18; ++fail_at)
		{
			comparison_state comparisons;
			allocation_state allocations;
			comparisons.throw_on_call = fail_at;
			try
			{
				tested_map values(generated_iterator(keys, 0),
					generated_iterator(keys, 6), throwing_less(&comparisons),
					map_allocator(&allocations));
			}
			catch (const injected_failure&)
			{
			}
			require(allocations.outstanding_blocks == 0,
				"range constructor rolls back nodes");
		}

		for (int fail_at = 0; fail_at < 7; ++fail_at)
		{
			comparison_state comparisons;
			allocation_state allocations;
			allocations.throw_on_call = fail_at;
			try
			{
				tested_map values(generated_iterator(keys, 0),
					generated_iterator(keys, 6), throwing_less(&comparisons),
					map_allocator(&allocations));
			}
			catch (const std::bad_alloc&)
			{
			}
			require(allocations.outstanding_blocks == 0,
				"range constructor handles allocation failure");
		}
	}

	void test_copy_constructor_rollback()
	{
		comparison_state comparisons;
		allocation_state allocations;
		{
			tested_map source((throwing_less(&comparisons)),
				map_allocator(&allocations));
			for (int key = 1; key <= 6; ++key)
				source.insert(map_value(key, key * 10));
			const int source_blocks = allocations.outstanding_blocks;
			comparisons.calls = 0;
			comparisons.throw_on_call = 2;
			bool thrown = false;
			try
			{
				tested_map copy(source);
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			comparisons.reset();
			require(thrown, "copy constructor injects a failure");
			require(allocations.outstanding_blocks == source_blocks,
				"copy constructor rolls back nodes");
		}
		require(allocations.outstanding_blocks == 0,
			"copy constructor source releases nodes");
	}

	void test_assignment_preserves_original()
	{
		comparison_state source_comparisons;
		comparison_state target_comparisons;
		allocation_state allocations;
		{
			tested_map source((throwing_less(&source_comparisons)),
				map_allocator(&allocations));
			for (int key = 1; key <= 6; ++key)
				source.insert(map_value(key, key * 10));

			tested_map target((throwing_less(&target_comparisons)),
				map_allocator(&allocations));
			target.insert(map_value(40, 400));
			target.insert(map_value(50, 500));
			const int expected[] = {40, 50};
			const int baseline_blocks = allocations.outstanding_blocks;

			source_comparisons.calls = 0;
			source_comparisons.throw_on_call = 3;
			bool thrown = false;
			try
			{
				target = source;
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			source_comparisons.reset();
			target_comparisons.reset();
			require(thrown, "assignment injects a comparator failure");
			require_keys(target, expected, 2,
				"assignment preserves original keys");
			require(allocations.outstanding_blocks == baseline_blocks,
				"assignment rolls back temporary nodes");

			allocations.reset_failure();
			allocations.throw_on_call = 2;
			thrown = false;
			try
			{
				target = source;
			}
			catch (const std::bad_alloc&)
			{
				thrown = true;
			}
			allocations.reset_failure();
			require(thrown, "assignment injects an allocation failure");
			require_keys(target, expected, 2,
				"allocation failure preserves original keys");
			require(allocations.outstanding_blocks == baseline_blocks,
				"allocation failure rolls back temporary nodes");
		}
		require(allocations.outstanding_blocks == 0,
			"assignment releases all nodes");
	}
}

int main()
{
	test_insert_does_not_compare_after_allocation();
	test_range_constructor_rollback();
	test_copy_constructor_rollback();
	test_assignment_preserves_original();
	std::cout << "map exception checks passed" << std::endl;
	return 0;
}
