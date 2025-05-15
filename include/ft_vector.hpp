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
		typedef typename allocator_type::difference_type difference_type;
		typedef typename allocator_type::size_type size_type;

		explicit vector(const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _data(NULL), _size(0), _capacity(0)
		{
		}

		explicit vector(size_type count, const value_type& value = value_type(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _data(NULL), _size(0), _capacity(0)
		{
			if (count > max_size())
				throw std::length_error("ft::vector::vector");
			_initialize_fill(count, value);
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
		iterator end() { return _iterator_at(_size); }
		const_iterator end() const { return _iterator_at(_size); }

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
			if (count > max_size())
				throw std::length_error("ft::vector::resize");
			if (count < _size)
			{
				while (_size > count)
					_alloc.destroy(_data + --_size);
				return;
			}
			if (count > _capacity)
				reserve(_next_capacity(count));
			const size_type old_size = _size;
			try
			{
				while (_size < count)
				{
					_alloc.construct(_data + _size, value);
					++_size;
				}
			}
			catch (...)
			{
				while (_size > old_size)
					_alloc.destroy(_data + --_size);
				throw;
			}
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
			if (count > max_size())
				throw std::length_error("ft::vector::assign");
			vector tmp(count, value, _alloc);
			_swap_storage(tmp);
		}

		template <class InputIt>
		void assign(InputIt first, InputIt last,
			typename ft::enable_if<!ft::is_integral<InputIt>::value>::type* = 0)
		{
			vector tmp(_alloc);
			for (; first != last; ++first)
				tmp.push_back(*first);
			_swap_storage(tmp);
		}

		void push_back(const value_type& value)
		{
			if (_size == _capacity)
			{
				value_type value_copy(value);
				reserve(_next_capacity(_size + 1));
				_alloc.construct(_data + _size, value_copy);
			}
			else
				_alloc.construct(_data + _size, value);
			++_size;
		}

		void pop_back()
		{
			_alloc.destroy(_data + --_size);
		}

		iterator insert(iterator pos, const value_type& value)
		{
			size_type index = _index_of(pos);
			insert(pos, 1, value);
			return _iterator_at(index);
		}

		void insert(iterator pos, size_type count, const value_type& value)
		{
			if (count == 0)
				return;
			size_type index = _index_of(pos);
			if (count > max_size() - _size)
				throw std::length_error("ft::vector::insert");
			value_type value_copy(value);
			if (_size + count > _capacity)
				_insert_fill_reallocate(index, count, value_copy,
					_next_capacity(_size + count));
			else
				_insert_fill_in_place(index, count, value_copy);
		}

		template <class InputIt>
		void insert(iterator pos, InputIt first, InputIt last,
			typename ft::enable_if<!ft::is_integral<InputIt>::value>::type* = 0)
		{
			size_type index = _index_of(pos);
			vector tmp(first, last, _alloc);
			if (tmp.empty())
				return;
			if (tmp.size() > max_size() - _size)
				throw std::length_error("ft::vector::insert");
			if (_size + tmp.size() > _capacity)
				_insert_range_reallocate(index, tmp,
					_next_capacity(_size + tmp.size()));
			else
				_insert_range_in_place(index, tmp);
		}

		iterator erase(iterator pos)
		{
			return erase(pos, pos + 1);
		}

		iterator erase(iterator first, iterator last)
		{
			size_type index = _index_of(first);
			size_type count = first == last
				? 0 : static_cast<size_type>(last - first);
			for (size_type i = index; i + count < _size; ++i)
				_data[i] = _data[i + count];
			for (size_type i = 0; i < count; ++i)
				_alloc.destroy(_data + _size - 1 - i);
			_size -= count;
			return _iterator_at(index);
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
			const size_type limit = max_size();
			if (minimum > limit)
				throw std::length_error("ft::vector capacity");
			size_type next;
			if (_capacity == 0)
				next = 1;
			else if (_capacity > limit - _capacity)
				next = limit;
			else
				next = _capacity * 2;
			if (next < minimum)
				next = minimum;
			return next;
		}

		iterator _iterator_at(size_type index)
		{
			return _data ? _data + index : _data;
		}

		const_iterator _iterator_at(size_type index) const
		{
			return _data ? _data + index : _data;
		}

		size_type _index_of(const_iterator pos) const
		{
			return _data ? static_cast<size_type>(pos - _data) : 0;
		}

		void _initialize_fill(size_type count, const value_type& value)
		{
			if (count == 0)
				return;
			pointer new_data = _alloc.allocate(count);
			size_type constructed = 0;
			try
			{
				for (; constructed < count; ++constructed)
					_alloc.construct(new_data + constructed, value);
			}
			catch (...)
			{
				while (constructed)
					_alloc.destroy(new_data + --constructed);
				_alloc.deallocate(new_data, count);
				throw;
			}
			_data = new_data;
			_size = count;
			_capacity = count;
		}

		void _swap_storage(vector& other)
		{
			std::swap(_data, other._data);
			std::swap(_size, other._size);
			std::swap(_capacity, other._capacity);
		}

		void _replace_storage(pointer new_data, size_type new_size,
			size_type new_capacity)
		{
			_destroy_storage();
			_data = new_data;
			_size = new_size;
			_capacity = new_capacity;
		}

		void _destroy_constructed_tail(size_type start, size_type count)
		{
			while (count)
				_alloc.destroy(_data + start + --count);
		}

		void _insert_fill_reallocate(size_type index, size_type count,
			const value_type& value, size_type new_capacity)
		{
			pointer new_data = _alloc.allocate(new_capacity);
			size_type constructed = 0;
			try
			{
				for (size_type i = 0; i < index; ++i, ++constructed)
					_alloc.construct(new_data + constructed, _data[i]);
				for (size_type i = 0; i < count; ++i, ++constructed)
					_alloc.construct(new_data + constructed, value);
				for (size_type i = index; i < _size; ++i, ++constructed)
					_alloc.construct(new_data + constructed, _data[i]);
			}
			catch (...)
			{
				while (constructed)
					_alloc.destroy(new_data + --constructed);
				_alloc.deallocate(new_data, new_capacity);
				throw;
			}
			_replace_storage(new_data, constructed, new_capacity);
		}

		void _insert_fill_in_place(size_type index, size_type count,
			const value_type& value)
		{
			const size_type old_size = _size;
			const size_type tail_size = old_size - index;
			size_type constructed = 0;
			try
			{
				if (count <= tail_size)
				{
					for (; constructed < count; ++constructed)
						_alloc.construct(_data + old_size + constructed,
							_data[old_size - count + constructed]);
					for (size_type i = old_size - count; i > index; --i)
						_data[i + count - 1] = _data[i - 1];
					for (size_type i = 0; i < count; ++i)
						_data[index + i] = value;
				}
				else
				{
					const size_type extra = count - tail_size;
					for (; constructed < extra; ++constructed)
						_alloc.construct(_data + old_size + constructed, value);
					for (size_type i = 0; i < tail_size; ++i, ++constructed)
						_alloc.construct(_data + old_size + constructed,
							_data[index + i]);
					for (size_type i = 0; i < tail_size; ++i)
						_data[index + i] = value;
				}
			}
			catch (...)
			{
				_destroy_constructed_tail(old_size, constructed);
				throw;
			}
			_size = old_size + count;
		}

		void _insert_range_reallocate(size_type index, const vector& values,
			size_type new_capacity)
		{
			pointer new_data = _alloc.allocate(new_capacity);
			size_type constructed = 0;
			try
			{
				for (size_type i = 0; i < index; ++i, ++constructed)
					_alloc.construct(new_data + constructed, _data[i]);
				for (size_type i = 0; i < values.size(); ++i, ++constructed)
					_alloc.construct(new_data + constructed, values[i]);
				for (size_type i = index; i < _size; ++i, ++constructed)
					_alloc.construct(new_data + constructed, _data[i]);
			}
			catch (...)
			{
				while (constructed)
					_alloc.destroy(new_data + --constructed);
				_alloc.deallocate(new_data, new_capacity);
				throw;
			}
			_replace_storage(new_data, constructed, new_capacity);
		}

		void _insert_range_in_place(size_type index, const vector& values)
		{
			const size_type count = values.size();
			const size_type old_size = _size;
			const size_type tail_size = old_size - index;
			size_type constructed = 0;
			try
			{
				if (count <= tail_size)
				{
					for (; constructed < count; ++constructed)
						_alloc.construct(_data + old_size + constructed,
							_data[old_size - count + constructed]);
					for (size_type i = old_size - count; i > index; --i)
						_data[i + count - 1] = _data[i - 1];
					for (size_type i = 0; i < count; ++i)
						_data[index + i] = values[i];
				}
				else
				{
					const size_type extra = count - tail_size;
					for (; constructed < extra; ++constructed)
						_alloc.construct(_data + old_size + constructed,
							values[tail_size + constructed]);
					for (size_type i = 0; i < tail_size; ++i, ++constructed)
						_alloc.construct(_data + old_size + constructed,
							_data[index + i]);
					for (size_type i = 0; i < tail_size; ++i)
						_data[index + i] = values[i];
				}
			}
			catch (...)
			{
				_destroy_constructed_tail(old_size, constructed);
				throw;
			}
			_size = old_size + count;
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
