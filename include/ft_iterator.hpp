#ifndef FT_ITERATOR_HPP
# define FT_ITERATOR_HPP

# include <cstddef>
# include <iterator>

namespace ft
{
	template <class Category, class T, class Distance = std::ptrdiff_t,
		class Pointer = T*, class Reference = T&>
	struct iterator
	{
		typedef Category iterator_category;
		typedef T value_type;
		typedef Distance difference_type;
		typedef Pointer pointer;
		typedef Reference reference;
	};

	template <class Iterator>
	struct iterator_traits
	{
		typedef typename Iterator::difference_type difference_type;
		typedef typename Iterator::value_type value_type;
		typedef typename Iterator::pointer pointer;
		typedef typename Iterator::reference reference;
		typedef typename Iterator::iterator_category iterator_category;
	};

	template <class T>
	struct iterator_traits<T*>
	{
		typedef std::ptrdiff_t difference_type;
		typedef T value_type;
		typedef T* pointer;
		typedef T& reference;
		typedef std::random_access_iterator_tag iterator_category;
	};

	template <class T>
	struct iterator_traits<const T*>
	{
		typedef std::ptrdiff_t difference_type;
		typedef T value_type;
		typedef const T* pointer;
		typedef const T& reference;
		typedef std::random_access_iterator_tag iterator_category;
	};

	template <class Iterator>
	class reverse_iterator
	{
	public:
		typedef Iterator iterator_type;
		typedef typename iterator_traits<Iterator>::iterator_category iterator_category;
		typedef typename iterator_traits<Iterator>::value_type value_type;
		typedef typename iterator_traits<Iterator>::difference_type difference_type;
		typedef typename iterator_traits<Iterator>::pointer pointer;
		typedef typename iterator_traits<Iterator>::reference reference;

		reverse_iterator() : _current()
		{
		}

		explicit reverse_iterator(iterator_type it) : _current(it)
		{
		}

		template <class U>
		reverse_iterator(const reverse_iterator<U>& other)
			: _current(other.base())
		{
		}

		iterator_type base() const
		{
			return _current;
		}

		reference operator*() const
		{
			iterator_type tmp(_current);
			return *--tmp;
		}

		pointer operator->() const
		{
			return &(operator*());
		}

		reverse_iterator& operator++()
		{
			--_current;
			return *this;
		}

		reverse_iterator operator++(int)
		{
			reverse_iterator tmp(*this);
			--_current;
			return tmp;
		}

		reverse_iterator& operator--()
		{
			++_current;
			return *this;
		}

		reverse_iterator operator--(int)
		{
			reverse_iterator tmp(*this);
			++_current;
			return tmp;
		}

		reverse_iterator operator+(difference_type n) const
		{
			return reverse_iterator(_current - n);
		}

		reverse_iterator& operator+=(difference_type n)
		{
			_current -= n;
			return *this;
		}

		reverse_iterator operator-(difference_type n) const
		{
			return reverse_iterator(_current + n);
		}

		reverse_iterator& operator-=(difference_type n)
		{
			_current += n;
			return *this;
		}

		reference operator[](difference_type n) const
		{
			return *(*this + n);
		}

	private:
		iterator_type _current;
	};

	template <class It1, class It2>
	bool operator==(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return lhs.base() == rhs.base();
	}

	template <class It1, class It2>
	bool operator!=(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return !(lhs == rhs);
	}

	template <class It1, class It2>
	bool operator<(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return rhs.base() < lhs.base();
	}

	template <class It1, class It2>
	bool operator<=(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return !(rhs < lhs);
	}

	template <class It1, class It2>
	bool operator>(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return rhs < lhs;
	}

	template <class It1, class It2>
	bool operator>=(const reverse_iterator<It1>& lhs,
		const reverse_iterator<It2>& rhs)
	{
		return !(lhs < rhs);
	}

	template <class It1, class It2>
	typename reverse_iterator<It1>::difference_type operator-(
		const reverse_iterator<It1>& lhs, const reverse_iterator<It2>& rhs)
	{
		return rhs.base() - lhs.base();
	}

	template <class Iterator>
	reverse_iterator<Iterator> operator+(
		typename reverse_iterator<Iterator>::difference_type n,
		const reverse_iterator<Iterator>& it)
	{
		return it + n;
	}
}

#endif
