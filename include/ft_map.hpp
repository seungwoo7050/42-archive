#ifndef FT_MAP_HPP
# define FT_MAP_HPP

# include <algorithm>
# include <cstddef>
# include <functional>
# include <memory>
# include "ft_algorithm.hpp"
# include "ft_iterator.hpp"
# include "ft_pair.hpp"

namespace ft
{
	template <class Key, class T, class Compare = std::less<Key>,
		class Alloc = std::allocator<ft::pair<const Key, T> > >
	class map
	{
	public:
		typedef Key key_type;
		typedef T mapped_type;
		typedef ft::pair<const key_type, mapped_type> value_type;
		typedef Compare key_compare;
		typedef Alloc allocator_type;
		typedef value_type& reference;
		typedef const value_type& const_reference;
		typedef typename allocator_type::pointer pointer;
		typedef typename allocator_type::const_pointer const_pointer;
		typedef std::ptrdiff_t difference_type;
		typedef std::size_t size_type;

	private:
		struct node
		{
			value_type value;
			node* parent;
			node* left;
			node* right;

			explicit node(const value_type& v)
				: value(v), parent(NULL), left(NULL), right(NULL)
			{
			}
		};

		typedef typename allocator_type::template rebind<node>::other node_allocator;

	public:
		explicit map(const key_compare& comp = key_compare(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _node_alloc(node_allocator()), _root(NULL),
			  _size(0), _comp(comp)
		{
		}

		~map()
		{
			_clear(_root);
		}

		bool empty() const { return _size == 0; }
		size_type size() const { return _size; }
		size_type max_size() const { return _node_alloc.max_size(); }
		key_compare key_comp() const { return _comp; }
		allocator_type get_allocator() const { return _alloc; }

	private:
		allocator_type _alloc;
		node_allocator _node_alloc;
		node* _root;
		size_type _size;
		key_compare _comp;

		node* _create_node(const value_type& value)
		{
			node* n = _node_alloc.allocate(1);
			try
			{
				_node_alloc.construct(n, node(value));
			}
			catch (...)
			{
				_node_alloc.deallocate(n, 1);
				throw;
			}
			return n;
		}

		void _destroy_node(node* n)
		{
			_node_alloc.destroy(n);
			_node_alloc.deallocate(n, 1);
		}

		void _clear(node* n)
		{
			if (n == NULL)
				return;
			_clear(n->left);
			_clear(n->right);
			_destroy_node(n);
		}
	};
}

#endif
