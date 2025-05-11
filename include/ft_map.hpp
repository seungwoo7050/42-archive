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
			bool red;

			explicit node(const value_type& v)
				: value(v), parent(NULL), left(NULL), right(NULL), red(true)
			{
			}
		};

		typedef typename allocator_type::template rebind<node>::other node_allocator;

	public:
		class value_compare
		{
			friend class map;

		public:
			bool operator()(const value_type& lhs, const value_type& rhs) const
			{
				return comp(lhs.first, rhs.first);
			}

		protected:
			key_compare comp;

			explicit value_compare(key_compare c) : comp(c)
			{
			}
		};

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

			bool operator==(const iterator& other) const
			{
				return _node == other._node;
			}

			bool operator!=(const const_iterator& other) const
			{
				return !(*this == other);
			}

			bool operator!=(const iterator& other) const
			{
				return !(*this == other);
			}

			friend bool operator==(const iterator& lhs,
				const const_iterator& rhs)
			{
				return const_iterator(lhs) == rhs;
			}

			friend bool operator!=(const iterator& lhs,
				const const_iterator& rhs)
			{
				return !(lhs == rhs);
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
			: _alloc(alloc), _node_alloc(node_allocator(alloc)), _root(NULL),
			  _size(0), _comp(comp)
		{
		}

		template <class InputIt>
		map(InputIt first, InputIt last, const key_compare& comp = key_compare(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _node_alloc(node_allocator(alloc)), _root(NULL),
			  _size(0), _comp(comp)
		{
			insert(first, last);
		}

		map(const map& other)
			: _alloc(other._alloc), _node_alloc(node_allocator(other._alloc)), _root(NULL),
			  _size(0), _comp(other._comp)
		{
			insert(other.begin(), other.end());
		}

		~map()
		{
			clear();
		}

		map& operator=(const map& other)
		{
			if (this != &other)
			{
				clear();
				_comp = other._comp;
				insert(other.begin(), other.end());
			}
			return *this;
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

		mapped_type& operator[](const key_type& key)
		{
			return insert(value_type(key, mapped_type())).first->second;
		}

		ft::pair<iterator, bool> insert(const value_type& value)
		{
			if (_root == NULL)
			{
				_root = _create_node(value);
				_root->red = false;
				++_size;
				return ft::make_pair(iterator(_root, _root), true);
			}
			node* parent = NULL;
			node* cur = _root;
			while (cur)
			{
				parent = cur;
				if (_comp(value.first, cur->value.first))
					cur = cur->left;
				else if (_comp(cur->value.first, value.first))
					cur = cur->right;
				else
					return ft::make_pair(iterator(cur, _root), false);
			}
			node* created = _create_node(value);
			created->parent = parent;
			if (_comp(value.first, parent->value.first))
				parent->left = created;
			else
				parent->right = created;
			_insert_fixup(created);
			++_size;
			return ft::make_pair(iterator(created, _root), true);
		}

		iterator insert(iterator hint, const value_type& value)
		{
			(void)hint;
			return insert(value).first;
		}

		template <class InputIt>
		void insert(InputIt first, InputIt last)
		{
			for (; first != last; ++first)
				insert(*first);
		}

		void erase(iterator pos)
		{
			if (pos == end())
				return;
			_erase_node(pos._node);
		}

		size_type erase(const key_type& key)
		{
			iterator it = find(key);
			if (it == end())
				return 0;
			erase(it);
			return 1;
		}

		void erase(iterator first, iterator last)
		{
			while (first != last)
			{
				iterator next = first;
				++next;
				erase(first);
				first = next;
			}
		}

		void clear()
		{
			_clear(_root);
			_root = NULL;
			_size = 0;
		}

		void swap(map& other)
		{
			std::swap(_alloc, other._alloc);
			std::swap(_node_alloc, other._node_alloc);
			std::swap(_root, other._root);
			std::swap(_size, other._size);
			std::swap(_comp, other._comp);
		}

		key_compare key_comp() const { return _comp; }
		value_compare value_comp() const { return value_compare(_comp); }
		allocator_type get_allocator() const { return _alloc; }

		iterator find(const key_type& key)
		{
			return iterator(_find_node(key), _root);
		}

		const_iterator find(const key_type& key) const
		{
			return const_iterator(_find_node(key), _root);
		}

		size_type count(const key_type& key) const
		{
			return _find_node(key) ? 1 : 0;
		}

		iterator lower_bound(const key_type& key)
		{
			return iterator(_lower_bound_node(key), _root);
		}

		const_iterator lower_bound(const key_type& key) const
		{
			return const_iterator(_lower_bound_node(key), _root);
		}

		iterator upper_bound(const key_type& key)
		{
			return iterator(_upper_bound_node(key), _root);
		}

		const_iterator upper_bound(const key_type& key) const
		{
			return const_iterator(_upper_bound_node(key), _root);
		}

		ft::pair<iterator, iterator> equal_range(const key_type& key)
		{
			return ft::make_pair(lower_bound(key), upper_bound(key));
		}

		ft::pair<const_iterator, const_iterator> equal_range(
			const key_type& key) const
		{
			return ft::make_pair(lower_bound(key), upper_bound(key));
		}

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

		static bool _is_red(node* n)
		{
			return n != NULL && n->red;
		}

		void _rotate_left(node* x)
		{
			node* y = x->right;
			x->right = y->left;
			if (y->left)
				y->left->parent = x;
			y->parent = x->parent;
			if (x->parent == NULL)
				_root = y;
			else if (x == x->parent->left)
				x->parent->left = y;
			else
				x->parent->right = y;
			y->left = x;
			x->parent = y;
		}

		void _rotate_right(node* x)
		{
			node* y = x->left;
			x->left = y->right;
			if (y->right)
				y->right->parent = x;
			y->parent = x->parent;
			if (x->parent == NULL)
				_root = y;
			else if (x == x->parent->right)
				x->parent->right = y;
			else
				x->parent->left = y;
			y->right = x;
			x->parent = y;
		}

		void _insert_fixup(node* z)
		{
			while (z->parent && _is_red(z->parent))
			{
				if (z->parent == z->parent->parent->left)
				{
					node* uncle = z->parent->parent->right;
					if (_is_red(uncle))
					{
						z->parent->red = false;
						uncle->red = false;
						z->parent->parent->red = true;
						z = z->parent->parent;
					}
					else
					{
						if (z == z->parent->right)
						{
							z = z->parent;
							_rotate_left(z);
						}
						z->parent->red = false;
						z->parent->parent->red = true;
						_rotate_right(z->parent->parent);
					}
				}
				else
				{
					node* uncle = z->parent->parent->left;
					if (_is_red(uncle))
					{
						z->parent->red = false;
						uncle->red = false;
						z->parent->parent->red = true;
						z = z->parent->parent;
					}
					else
					{
						if (z == z->parent->left)
						{
							z = z->parent;
							_rotate_right(z);
						}
						z->parent->red = false;
						z->parent->parent->red = true;
						_rotate_left(z->parent->parent);
					}
				}
			}
			if (_root)
				_root->red = false;
		}

		node* _find_node(const key_type& key) const
		{
			node* cur = _root;
			while (cur)
			{
				if (_comp(key, cur->value.first))
					cur = cur->left;
				else if (_comp(cur->value.first, key))
					cur = cur->right;
				else
					return cur;
			}
			return NULL;
		}

		node* _lower_bound_node(const key_type& key) const
		{
			node* cur = _root;
			node* result = NULL;
			while (cur)
			{
				if (!_comp(cur->value.first, key))
				{
					result = cur;
					cur = cur->left;
				}
				else
					cur = cur->right;
			}
			return result;
		}

		node* _upper_bound_node(const key_type& key) const
		{
			node* cur = _root;
			node* result = NULL;
			while (cur)
			{
				if (_comp(key, cur->value.first))
				{
					result = cur;
					cur = cur->left;
				}
				else
					cur = cur->right;
			}
			return result;
		}

		void _transplant(node* old_node, node* new_node)
		{
			if (old_node->parent == NULL)
				_root = new_node;
			else if (old_node == old_node->parent->left)
				old_node->parent->left = new_node;
			else
				old_node->parent->right = new_node;
			if (new_node)
				new_node->parent = old_node->parent;
		}

		void _erase_node(node* target)
		{
			if (target->left == NULL)
				_transplant(target, target->right);
			else if (target->right == NULL)
				_transplant(target, target->left);
			else
			{
				node* successor = _minimum(target->right);
				if (successor->parent != target)
				{
					_transplant(successor, successor->right);
					successor->right = target->right;
					successor->right->parent = successor;
				}
				_transplant(target, successor);
				successor->left = target->left;
				successor->left->parent = successor;
			}
			_destroy_node(target);
			--_size;
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

	template <class Key, class T, class Compare, class Alloc>
	bool operator==(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return lhs.size() == rhs.size()
			&& ft::equal(lhs.begin(), lhs.end(), rhs.begin());
	}

	template <class Key, class T, class Compare, class Alloc>
	bool operator!=(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return !(lhs == rhs);
	}

	template <class Key, class T, class Compare, class Alloc>
	bool operator<(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return ft::lexicographical_compare(lhs.begin(), lhs.end(),
			rhs.begin(), rhs.end());
	}

	template <class Key, class T, class Compare, class Alloc>
	bool operator<=(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return !(rhs < lhs);
	}

	template <class Key, class T, class Compare, class Alloc>
	bool operator>(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return rhs < lhs;
	}

	template <class Key, class T, class Compare, class Alloc>
	bool operator>=(const map<Key, T, Compare, Alloc>& lhs,
		const map<Key, T, Compare, Alloc>& rhs)
	{
		return !(lhs < rhs);
	}

	template <class Key, class T, class Compare, class Alloc>
	void swap(map<Key, T, Compare, Alloc>& lhs,
		map<Key, T, Compare, Alloc>& rhs)
	{
		lhs.swap(rhs);
	}
}

#endif
