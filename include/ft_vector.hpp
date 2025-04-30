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
			assign(count, value);
		}

		template <class InputIt>
		vector(InputIt first, InputIt last,
			const allocator_type& alloc = allocator_type(),
			typename ft::enable_if<!ft::is_integral<InputIt>::value>::type* = 0)
			: _alloc(alloc), _data(NULL), _size(0), _capacity(0)
		{
			assign(first, last);
		}

		vector(const vector& other)
			: _alloc(other._alloc), _data(NULL), _size(0), _capacity(0)
		{
			assign(other.begin(), other.end());
		}

		~vector()
		{
			_destroy_storage();
		}

		vector& operator=(const vector& other)
		{
			if (this != &other)
				assign(other.begin(), other.end());
			return *this;
		}

		iterator begin() { return _data; }
		const_iterator begin() const { return _data; }
		iterator end() { return _data + _size; }
		const_iterator end() const { return _data + _size; }

		reverse_iterator rbegin() { return reverse_iterator(end()); }
		const_reverse_iterator rbegin() const
		{
			return const_reverse_iterator(end());
		}

		reverse_iterator rend() { return reverse_iterator(begin()); }
		const_reverse_iterator rend() const
		{
			return const_reverse_iterator(begin());
		}

		size_type size() const { return _size; }
		size_type capacity() const { return _capacity; }
		bool empty() const { return _size == 0; }
		size_type max_size() const { return _alloc.max_size(); }

		void reserve(size_type new_cap)
		{
			if (new_cap > max_size())
				throw std::length_error("ft::vector::reserve");
			if (new_cap > _capacity)
				_reallocate(new_cap);
		}

		void resize(size_type count, value_type value = value_type())
		{
			if (count < _size)
			{
				while (_size > count)
					_alloc.destroy(_data + --_size);
				return;
			}
			if (count > _capacity)
				reserve(_next_capacity(count));
			while (_size < count)
				_alloc.construct(_data + _size++, value);
		}

		reference operator[](size_type pos) { return _data[pos]; }
		const_reference operator[](size_type pos) const { return _data[pos]; }

		reference at(size_type pos)
		{
			if (pos >= _size)
				throw std::out_of_range("ft::vector::at");
			return _data[pos];
		}

		const_reference at(size_type pos) const
		{
			if (pos >= _size)
				throw std::out_of_range("ft::vector::at");
			return _data[pos];
		}

		reference front() { return _data[0]; }
		const_reference front() const { return _data[0]; }
		reference back() { return _data[_size - 1]; }
		const_reference back() const { return _data[_size - 1]; }

		void assign(size_type count, const value_type& value)
		{
			clear();
			if (count > _capacity)
			{
				_destroy_storage();
				_data = _alloc.allocate(count);
				_capacity = count;
			}
			for (size_type i = 0; i < count; ++i)
				_alloc.construct(_data + i, value);
			_size = count;
		}

		template <class InputIt>
		void assign(InputIt first, InputIt last,
			typename ft::enable_if<!ft::is_integral<InputIt>::value>::type* = 0)
		{
			clear();
			for (; first != last; ++first)
				push_back(*first);
		}

		void push_back(const value_type& value)
		{
			if (_size == _capacity)
				reserve(_next_capacity(_size + 1));
			_alloc.construct(_data + _size++, value);
		}

		void pop_back()
		{
			_alloc.destroy(_data + --_size);
		}

		iterator insert(iterator pos, const value_type& value)
		{
			size_type index = static_cast<size_type>(pos - begin());
			insert(pos, 1, value);
			return begin() + index;
		}

		void insert(iterator pos, size_type count, const value_type& value)
		{
			size_type index = static_cast<size_type>(pos - begin());
			if (count == 0)
				return;
			if (_size + count > _capacity)
				reserve(_next_capacity(_size + count));
			for (size_type i = _size; i > index; --i)
			{
				_alloc.construct(_data + i + count - 1, _data[i - 1]);
				_alloc.destroy(_data + i - 1);
			}
			for (size_type i = 0; i < count; ++i)
				_alloc.construct(_data + index + i, value);
			_size += count;
		}

		template <class InputIt>
		void insert(iterator pos, InputIt first, InputIt last,
			typename ft::enable_if<!ft::is_integral<InputIt>::value>::type* = 0)
		{
			size_type index = static_cast<size_type>(pos - begin());
			for (; first != last; ++first, ++index)
				insert(begin() + index, *first);
		}

		iterator erase(iterator pos)
		{
			return erase(pos, pos + 1);
		}

		iterator erase(iterator first, iterator last)
		{
			size_type index = static_cast<size_type>(first - begin());
			size_type count = static_cast<size_type>(last - first);
			for (size_type i = index; i + count < _size; ++i)
				_data[i] = _data[i + count];
			for (size_type i = 0; i < count; ++i)
				_alloc.destroy(_data + _size - 1 - i);
			_size -= count;
			return begin() + index;
		}

		void clear()
		{
			while (_size)
				_alloc.destroy(_data + --_size);
		}

		void swap(vector& other)
		{
			std::swap(_alloc, other._alloc);
			std::swap(_data, other._data);
			std::swap(_size, other._size);
			std::swap(_capacity, other._capacity);
		}

		allocator_type get_allocator() const { return _alloc; }

	private:
		allocator_type _alloc;
		pointer _data;
		size_type _size;
		size_type _capacity;

		size_type _next_capacity(size_type minimum) const
		{
			size_type next = _capacity == 0 ? 1 : _capacity * 2;
			if (next < minimum)
				next = minimum;
			if (next > max_size())
				throw std::length_error("ft::vector capacity");
			return next;
		}

		void _reallocate(size_type new_cap)
		{
			pointer new_data = _alloc.allocate(new_cap);
			size_type i = 0;
			try
			{
				for (; i < _size; ++i)
					_alloc.construct(new_data + i, _data[i]);
			}
			catch (...)
			{
				while (i)
					_alloc.destroy(new_data + --i);
				_alloc.deallocate(new_data, new_cap);
				throw;
			}
			clear();
			if (_data)
				_alloc.deallocate(_data, _capacity);
			_data = new_data;
			_size = i;
			_capacity = new_cap;
		}

		void _destroy_storage()
		{
			clear();
			if (_data)
				_alloc.deallocate(_data, _capacity);
			_data = NULL;
			_capacity = 0;
		}
	};

	template <class T, class Alloc>
	bool operator==(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return lhs.size() == rhs.size()
			&& ft::equal(lhs.begin(), lhs.end(), rhs.begin());
	}

	template <class T, class Alloc>
	bool operator!=(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return !(lhs == rhs);
	}

	template <class T, class Alloc>
	bool operator<(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return ft::lexicographical_compare(lhs.begin(), lhs.end(),
			rhs.begin(), rhs.end());
	}

	template <class T, class Alloc>
	bool operator<=(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return !(rhs < lhs);
	}

	template <class T, class Alloc>
	bool operator>(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return rhs < lhs;
	}

	template <class T, class Alloc>
	bool operator>=(const vector<T, Alloc>& lhs, const vector<T, Alloc>& rhs)
	{
		return !(lhs < rhs);
	}

	template <class T, class Alloc>
	void swap(vector<T, Alloc>& lhs, vector<T, Alloc>& rhs)
	{
		lhs.swap(rhs);
	}
}

#endif
