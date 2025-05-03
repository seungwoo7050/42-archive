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
		class iterator
			: public ft::iterator<std::bidirectional_iterator_tag, value_type>
		{
			friend class map;
			friend class const_iterator;

		public:
			iterator() : _node(NULL), _root(NULL)
			{
			}

			reference operator*() const { return _node->value; }
			pointer operator->() const { return &_node->value; }

			iterator& operator++()
			{
				_node = _next(_node);
				return *this;
			}

			iterator operator++(int)
			{
				iterator tmp(*this);
				++(*this);
				return tmp;
			}

			iterator& operator--()
			{
				if (_node == NULL)
					_node = _maximum(_root);
				else
					_node = _previous(_node);
				return *this;
			}

			iterator operator--(int)
			{
				iterator tmp(*this);
				--(*this);
				return tmp;
			}

			bool operator==(const iterator& other) const
			{
				return _node == other._node;
			}

			bool operator!=(const iterator& other) const
			{
				return !(*this == other);
			}

		private:
			node* _node;
			node* _root;

			iterator(node* n, node* r) : _node(n), _root(r)
			{
			}
		};

		class const_iterator
			: public ft::iterator<std::bidirectional_iterator_tag,
				const value_type>
		{
			friend class map;

		public:
			const_iterator() : _node(NULL), _root(NULL)
			{
			}

			const_iterator(const iterator& other)
				: _node(other._node), _root(other._root)
			{
			}

			const_reference operator*() const { return _node->value; }
			const_pointer operator->() const { return &_node->value; }

			const_iterator& operator++()
			{
				_node = _next(_node);
				return *this;
			}

			const_iterator operator++(int)
			{
				const_iterator tmp(*this);
				++(*this);
				return tmp;
			}

			const_iterator& operator--()
			{
				if (_node == NULL)
					_node = _maximum(_root);
				else
					_node = _previous(_node);
				return *this;
			}

			const_iterator operator--(int)
			{
				const_iterator tmp(*this);
				--(*this);
				return tmp;
			}

			bool operator==(const const_iterator& other) const
			{
				return _node == other._node;
			}

			bool operator!=(const const_iterator& other) const
			{
				return !(*this == other);
			}

		private:
			node* _node;
			node* _root;

			const_iterator(node* n, node* r) : _node(n), _root(r)
			{
			}
		};

		typedef ft::reverse_iterator<iterator> reverse_iterator;
		typedef ft::reverse_iterator<const_iterator> const_reverse_iterator;

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

		iterator begin() { return iterator(_minimum(_root), _root); }
		const_iterator begin() const
		{
			return const_iterator(_minimum(_root), _root);
		}

		iterator end() { return iterator(NULL, _root); }
		const_iterator end() const { return const_iterator(NULL, _root); }

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

		static node* _minimum(node* n)
		{
			if (n == NULL)
				return NULL;
			while (n->left)
				n = n->left;
			return n;
		}

		static node* _maximum(node* n)
		{
			if (n == NULL)
				return NULL;
			while (n->right)
				n = n->right;
			return n;
		}

		static node* _next(node* n)
		{
			if (n == NULL)
				return NULL;
			if (n->right)
				return _minimum(n->right);
			node* parent = n->parent;
			while (parent && n == parent->right)
			{
				n = parent;
				parent = parent->parent;
			}
			return parent;
		}

		static node* _previous(node* n)
		{
			if (n == NULL)
				return NULL;
			if (n->left)
				return _maximum(n->left);
			node* parent = n->parent;
			while (parent && n == parent->left)
			{
				n = parent;
				parent = parent->parent;
			}
			return parent;
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
