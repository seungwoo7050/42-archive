#include <cstdlib>
#include <iostream>
#include <memory>
#include <new>
#include <set>
#include <stdexcept>
#include <string>
#include "ft_vector.hpp"

namespace
{
	class injected_failure : public std::exception
	{
	public:
		const char* what() const throw()
		{
			return "injected element failure";
		}
	};

	class tracked_value
	{
	public:
		int value;

		static std::set<const void*> live;
		static int copy_attempts;
		static int assignment_attempts;
		static int throw_on_copy;
		static int throw_on_assignment;
		static int invalid_copy;
		static int invalid_destroy;

		explicit tracked_value(int number = 0) : value(number)
		{
			live.insert(this);
		}

		tracked_value(const tracked_value& other)
		{
			if (live.find(&other) == live.end())
			{
				++invalid_copy;
				throw injected_failure();
			}
			if (copy_attempts++ == throw_on_copy)
				throw injected_failure();
			value = other.value;
			live.insert(this);
		}

		~tracked_value()
		{
			if (live.erase(this) != 1)
				++invalid_destroy;
		}

		tracked_value& operator=(const tracked_value& other)
		{
			if (live.find(this) == live.end()
				|| live.find(&other) == live.end())
			{
				++invalid_copy;
				throw injected_failure();
			}
			if (assignment_attempts++ == throw_on_assignment)
				throw injected_failure();
			value = other.value;
			return *this;
		}

		static void reset_failures()
		{
			copy_attempts = 0;
			assignment_attempts = 0;
			throw_on_copy = -1;
			throw_on_assignment = -1;
		}
	};

	std::set<const void*> tracked_value::live;
	int tracked_value::copy_attempts = 0;
	int tracked_value::assignment_attempts = 0;
	int tracked_value::throw_on_copy = -1;
	int tracked_value::throw_on_assignment = -1;
	int tracked_value::invalid_copy = 0;
	int tracked_value::invalid_destroy = 0;

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

		static int outstanding_blocks;
		static int allocation_attempts;
		static int throw_on_allocate;
		static size_type size_limit;

		tracking_allocator()
		{
		}

		template <class U>
		tracking_allocator(const tracking_allocator<U>&)
		{
		}

		pointer allocate(size_type count, const void* = 0)
		{
			if (count > max_size())
				throw std::bad_alloc();
			if (allocation_attempts++ == throw_on_allocate)
				throw std::bad_alloc();
			pointer result = std::allocator<T>().allocate(count);
			++outstanding_blocks;
			return result;
		}

		void deallocate(pointer data, size_type count)
		{
			std::allocator<T>().deallocate(data, count);
			--outstanding_blocks;
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
			const size_type normal = std::allocator<T>().max_size();
			return size_limit != 0 && size_limit < normal ? size_limit : normal;
		}

		static void reset_allocation_failures()
		{
			allocation_attempts = 0;
			throw_on_allocate = -1;
			size_limit = 0;
		}
	};

	template <class T>
	int tracking_allocator<T>::outstanding_blocks = 0;

	template <class T>
	int tracking_allocator<T>::allocation_attempts = 0;

	template <class T>
	int tracking_allocator<T>::throw_on_allocate = -1;

	template <class T>
	typename tracking_allocator<T>::size_type
		tracking_allocator<T>::size_limit = 0;

	template <class T, class U>
	bool operator==(const tracking_allocator<T>&, const tracking_allocator<U>&)
	{
		return true;
	}

	template <class T, class U>
	bool operator!=(const tracking_allocator<T>& lhs,
		const tracking_allocator<U>& rhs)
	{
		return !(lhs == rhs);
	}

	typedef tracking_allocator<tracked_value> value_allocator;
	typedef ft::vector<tracked_value, value_allocator> tracked_vector;

	void require(bool condition, const std::string& message)
	{
		if (!condition)
		{
			std::cerr << "FAIL: " << message << std::endl;
			std::exit(1);
		}
	}

	void reset_injection()
	{
		tracked_value::reset_failures();
		value_allocator::reset_allocation_failures();
	}

	void require_clean(const std::string& label)
	{
		require(tracked_value::live.empty(), label + " live objects");
		require(tracked_value::invalid_copy == 0, label + " invalid copy");
		require(tracked_value::invalid_destroy == 0,
			label + " invalid destruction");
		require(value_allocator::outstanding_blocks == 0,
			label + " allocated blocks");
	}

	void require_values(const tracked_vector& values, const int* expected,
		std::size_t count, const std::string& label)
	{
		require(values.size() == count, label + " size");
		for (std::size_t i = 0; i < count; ++i)
			require(values[i].value == expected[i], label + " value");
	}

	void test_fill_constructor_rollback()
	{
		reset_injection();
		{
			tracked_value seed(7);
			tracked_value::throw_on_copy = 2;
			bool thrown = false;
			try
			{
				tracked_vector values(5, seed);
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			reset_injection();
			require(thrown, "fill constructor injects a failure");
			require(tracked_value::live.size() == 1,
				"fill constructor destroys its prefix");
			require(value_allocator::outstanding_blocks == 0,
				"fill constructor releases its block");
		}
		require_clean("fill constructor rollback");
	}

	void test_assign_preserves_original()
	{
		reset_injection();
		{
			tracked_value original(3);
			tracked_value replacement(9);
			tracked_vector values(3, original);
			const int expected[] = {3, 3, 3};
			tracked_value::copy_attempts = 0;
			tracked_value::throw_on_copy = 1;
			bool thrown = false;
			try
			{
				values.assign(5, replacement);
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			reset_injection();
			require(thrown, "fill assign injects a failure");
			require_values(values, expected, 3,
				"fill assign preserves original");

			values.assign(4, values[1]);
			const int self_expected[] = {3, 3, 3, 3};
			require_values(values, self_expected, 4,
				"fill assign snapshots an aliased value");
		}
		require_clean("fill assign");
	}

	void test_copy_assignment_preserves_original()
	{
		reset_injection();
		{
			tracked_value source_value(5);
			tracked_value target_value(8);
			tracked_vector source(5, source_value);
			tracked_vector target(2, target_value);
			const int expected[] = {8, 8};
			tracked_value::copy_attempts = 0;
			tracked_value::throw_on_copy = 3;
			bool thrown = false;
			try
			{
				target = source;
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			reset_injection();
			require(thrown, "copy assignment injects a failure");
			require_values(target, expected, 2,
				"copy assignment preserves original");
		}
		require_clean("copy assignment");
	}

	void test_resize_rollback()
	{
		reset_injection();
		{
			tracked_value original(4);
			tracked_value appended(6);
			tracked_vector values(2, original);
			values.reserve(8);
			const int expected[] = {4, 4};
			tracked_value::copy_attempts = 0;
			tracked_value::throw_on_copy = 1;
			bool thrown = false;
			try
			{
				values.resize(5, appended);
			}
			catch (const injected_failure&)
			{
				thrown = true;
			}
			reset_injection();
			require(thrown, "resize injects a failure");
			require_values(values, expected, 2, "resize rolls back suffix");
		}
		require_clean("resize rollback");
	}

	void test_aliased_push_back()
	{
		reset_injection();
		{
			tracked_value seed(11);
			tracked_vector values(1, seed);
			values.push_back(values[0]);
			const int expected[] = {11, 11};
			require_values(values, expected, 2,
				"push_back snapshots an aliased value");
		}
		require_clean("aliased push_back");
	}

	void test_bounded_growth_and_empty_iterators()
	{
		typedef tracking_allocator<int> int_allocator;
		typedef ft::vector<int, int_allocator> int_vector;
		int_allocator::reset_allocation_failures();
		int_allocator::size_limit = 5;
		{
			int_vector values;
			require(values.begin() == values.end(), "empty begin equals end");
			values.insert(values.end(), 0, 4);
			values.erase(values.begin(), values.end());
			values.reserve(3);
			for (int i = 0; i < 4; ++i)
				values.push_back(i);
			require(values.size() == 4, "bounded allocator accepts growth");
			require(values.capacity() == 5,
				"bounded allocator saturates capacity");
		}
		require(int_allocator::outstanding_blocks == 0,
			"bounded allocator releases storage");
		int_allocator::reset_allocation_failures();
	}
}

int main()
{
	test_fill_constructor_rollback();
	test_assign_preserves_original();
	test_copy_assignment_preserves_original();
	test_resize_rollback();
	test_aliased_push_back();
	test_bounded_growth_and_empty_iterators();
	std::cout << "vector exception checks passed" << std::endl;
	return 0;
}
