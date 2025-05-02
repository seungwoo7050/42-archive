#ifndef FT_STACK_HPP
# define FT_STACK_HPP

# include "ft_vector.hpp"

namespace ft
{
	template <class T, class Container = ft::vector<T> >
	class stack
	{
	public:
		typedef Container container_type;
		typedef typename container_type::value_type value_type;
		typedef typename container_type::size_type size_type;

		explicit stack(const container_type& cont = container_type())
			: c(cont)
		{
		}

		bool empty() const { return c.empty(); }
		size_type size() const { return c.size(); }
		value_type& top() { return c.back(); }
		const value_type& top() const { return c.back(); }
		void push(const value_type& value) { c.push_back(value); }
		void pop() { c.pop_back(); }

	protected:
		container_type c;

		template <class U, class C>
		friend bool operator==(const stack<U, C>& lhs,
			const stack<U, C>& rhs);
		template <class U, class C>
		friend bool operator<(const stack<U, C>& lhs,
			const stack<U, C>& rhs);
	};

	template <class T, class Container>
	bool operator==(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return lhs.c == rhs.c;
	}

	template <class T, class Container>
	bool operator!=(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return !(lhs == rhs);
	}

	template <class T, class Container>
	bool operator<(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return lhs.c < rhs.c;
	}

	template <class T, class Container>
	bool operator<=(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return !(rhs < lhs);
	}

	template <class T, class Container>
	bool operator>(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return rhs < lhs;
	}

	template <class T, class Container>
	bool operator>=(const stack<T, Container>& lhs,
		const stack<T, Container>& rhs)
	{
		return !(lhs < rhs);
	}
}

#endif
