#ifndef FT_VECTOR_HPP
# define FT_VECTOR_HPP

# include <algorithm>
# include <cstddef>
# include <limits>
# include <memory>
# include <stdexcept>
# include "ft_algorithm.hpp"
# include "ft_iterator.hpp"
# include "ft_type_traits.hpp"

namespace ft
{
	template <class T, class Alloc = std::allocator<T> >
	class vector
	{
	public:
		typedef T value_type;
		typedef Alloc allocator_type;
		typedef typename allocator_type::reference reference;
		typedef typename allocator_type::const_reference const_reference;
		typedef typename allocator_type::pointer pointer;
		typedef typename allocator_type::const_pointer const_pointer;
		typedef pointer iterator;
		typedef const_pointer const_iterator;
		typedef ft::reverse_iterator<iterator> reverse_iterator;
		typedef ft::reverse_iterator<const_iterator> const_reverse_iterator;
		typedef std::ptrdiff_t difference_type;
		typedef std::size_t size_type;

		explicit vector(const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _data(NULL), _size(0), _capacity(0)
		{
		}

		explicit vector(size_type count, const value_type& value = value_type(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _data(NULL), _size(0), _capacity(0)
		{
			_assign_fill(count, value);
		}

		~vector()
		{
			_destroy_storage();
		}

		size_type size() const { return _size; }
		bool empty() const { return _size == 0; }
		allocator_type get_allocator() const { return _alloc; }

	private:
		allocator_type _alloc;
		pointer _data;
		size_type _size;
		size_type _capacity;

		void _assign_fill(size_type count, const value_type& value)
		{
			if (count == 0)
				return;
			_data = _alloc.allocate(count);
			_capacity = count;
			try
			{
				for (; _size < count; ++_size)
					_alloc.construct(_data + _size, value);
			}
			catch (...)
			{
				_destroy_storage();
				throw;
			}
		}

		void _destroy_storage()
		{
			while (_size)
				_alloc.destroy(_data + --_size);
			if (_data)
				_alloc.deallocate(_data, _capacity);
			_data = NULL;
			_capacity = 0;
		}
	};
}

#endif
