#include <cstdlib>
#include <iostream>
#include <memory>
#include <new>
#include <stdexcept>
#include <string>

#include "ft_vector.hpp"

namespace
{
	template <class T>
	class bounded_allocator
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
			typedef bounded_allocator<U> other;
		};

		static int outstanding_blocks;
		static size_type size_limit;

		bounded_allocator()
		{
		}

		template <class U>
		bounded_allocator(const bounded_allocator<U>&)
		{
		}

		pointer allocate(size_type count, const void* = 0)
		{
			if (count > max_size())
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
			return size_limit < normal ? size_limit : normal;
		}
	};

	template <class T>
	int bounded_allocator<T>::outstanding_blocks = 0;

	template <class T>
	typename bounded_allocator<T>::size_type bounded_allocator<T>::size_limit = 5;

	template <class T, class U>
	bool operator==(const bounded_allocator<T>&, const bounded_allocator<U>&)
	{
		return true;
	}

	template <class T, class U>
	bool operator!=(const bounded_allocator<T>& lhs,
		const bounded_allocator<U>& rhs)
	{
		return !(lhs == rhs);
	}

	void require(bool condition, const std::string& message)
	{
		if (!condition)
		{
			std::cerr << "FAIL: " << message << std::endl;
			std::exit(1);
		}
	}

	void test_bounded_growth()
	{
		typedef bounded_allocator<int> int_allocator;
		typedef ft::vector<int, int_allocator> int_vector;
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
			bool thrown = false;
			try
			{
				values.reserve(6);
			}
			catch (const std::length_error&)
			{
				thrown = true;
			}
			require(thrown, "bounded allocator rejects excess capacity");
		}
		require(int_allocator::outstanding_blocks == 0,
			"bounded allocator releases storage");
	}
}

int main()
{
	test_bounded_growth();
	std::cout << "vector exception checks passed" << std::endl;
	return 0;
}
