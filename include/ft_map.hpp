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
		struct node_base
		{
			node_base* parent;
			node_base* left;
			node_base* right;
			bool red;
			bool is_header;

			explicit node_base(bool header = false)
				: parent(NULL), left(header ? this : NULL),
				  right(header ? this : NULL), red(false), is_header(header)
			{
			}
		};

		struct node : node_base
		{
			value_type value;

			explicit node(const value_type& v)
				: node_base(false), value(v)
			{
				this->red = true;
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
			iterator() : _node(NULL)
			{
			}

			reference operator*() const
			{
				return static_cast<node*>(_node)->value;
			}

			pointer operator->() const
			{
				return &static_cast<node*>(_node)->value;
			}

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
				_node = _previous(_node);
				return *this;
			}

			iterator operator--(int)
			{
				iterator tmp(*this);
				--(*this);
				return tmp;
			}

			template <class OtherIterator>
			bool operator==(const OtherIterator& other) const
			{
				return _node == other._node;
			}

			template <class OtherIterator>
			bool operator!=(const OtherIterator& other) const
			{
				return !(*this == other);
			}

		private:
			node_base* _node;

			explicit iterator(node_base* n) : _node(n)
			{
			}
		};

		class const_iterator
			: public ft::iterator<std::bidirectional_iterator_tag,
				const value_type>
		{
			friend class map;
			friend class iterator;

		public:
			const_iterator() : _node(NULL)
			{
			}

			const_iterator(const iterator& other)
				: _node(other._node)
			{
			}

			const_reference operator*() const
			{
				return static_cast<const node*>(_node)->value;
			}

			const_pointer operator->() const
			{
				return &static_cast<const node*>(_node)->value;
			}

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
				_node = _previous(_node);
				return *this;
			}

			const_iterator operator--(int)
			{
				const_iterator tmp(*this);
				--(*this);
				return tmp;
			}

			template <class OtherIterator>
			bool operator==(const OtherIterator& other) const
			{
				return _node == other._node;
			}

			template <class OtherIterator>
			bool operator!=(const OtherIterator& other) const
			{
				return !(*this == other);
			}

		private:
			node_base* _node;

			explicit const_iterator(node_base* n) : _node(n)
			{
			}
		};

		typedef ft::reverse_iterator<iterator> reverse_iterator;
		typedef ft::reverse_iterator<const_iterator> const_reverse_iterator;

		explicit map(const key_compare& comp = key_compare(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _node_alloc(node_allocator(alloc)), _header(true),
			  _size(0), _comp(comp)
		{
		}

		template <class InputIt>
		map(InputIt first, InputIt last, const key_compare& comp = key_compare(),
			const allocator_type& alloc = allocator_type())
			: _alloc(alloc), _node_alloc(node_allocator(alloc)), _header(true),
			  _size(0), _comp(comp)
		{
			try
			{
				insert(first, last);
			}
			catch (...)
			{
				clear();
				throw;
			}
		}

		map(const map& other)
			: _alloc(other._alloc), _node_alloc(node_allocator(other._alloc)),
			  _header(true), _size(0), _comp(other._comp)
		{
			try
			{
				insert(other.begin(), other.end());
			}
			catch (...)
			{
				clear();
				throw;
			}
		}

		~map()
		{
			clear();
		}

		map& operator=(const map& other)
		{
			if (this != &other)
			{
				map tmp(other.begin(), other.end(), other._comp, _alloc);
				_swap_tree_and_compare(tmp);
			}
			return *this;
		}

		iterator begin() { return iterator(_header.left); }
		const_iterator begin() const
		{
			return const_iterator(_header.left);
		}

		iterator end() { return iterator(&_header); }
		const_iterator end() const
		{
			return const_iterator(const_cast<node_base*>(&_header));
		}

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
			if (_root() == NULL)
			{
				node_base* created = _create_node(value);
				created->red = false;
				created->parent = &_header;
				_header.parent = created;
				_header.left = created;
				_header.right = created;
				++_size;
				return ft::make_pair(iterator(created), true);
			}
			node_base* parent = &_header;
			node_base* cur = _root();
			bool insert_left = false;
			while (cur)
			{
				parent = cur;
				if (_comp(value.first, _value(cur).first))
				{
					insert_left = true;
					cur = cur->left;
				}
				else if (_comp(_value(cur).first, value.first))
				{
					insert_left = false;
					cur = cur->right;
				}
				else
					return ft::make_pair(iterator(cur), false);
			}
			node_base* created = _create_node(value);
			created->parent = parent;
			if (insert_left)
				parent->left = created;
			else
				parent->right = created;
			_insert_fixup(created);
			++_size;
			_refresh_header();
			return ft::make_pair(iterator(created), true);
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
			_clear(_root());
			_size = 0;
			_reset_header();
		}

		void swap(map& other)
		{
			std::swap(_alloc, other._alloc);
			std::swap(_node_alloc, other._node_alloc);
			std::swap(_header.parent, other._header.parent);
			std::swap(_size, other._size);
			std::swap(_comp, other._comp);
			_refresh_header();
			other._refresh_header();
		}

		key_compare key_comp() const { return _comp; }
		value_compare value_comp() const { return value_compare(_comp); }
		allocator_type get_allocator() const { return _alloc; }

		iterator find(const key_type& key)
		{
			node_base* found = _find_node(key);
			return iterator(found ? found : &_header);
		}

		const_iterator find(const key_type& key) const
		{
			node_base* found = _find_node(key);
			return const_iterator(found ? found
				: const_cast<node_base*>(&_header));
		}

		size_type count(const key_type& key) const
		{
			return _find_node(key) ? 1 : 0;
		}

		iterator lower_bound(const key_type& key)
		{
			node_base* found = _lower_bound_node(key);
			return iterator(found ? found : &_header);
		}

		const_iterator lower_bound(const key_type& key) const
		{
			node_base* found = _lower_bound_node(key);
			return const_iterator(found ? found
				: const_cast<node_base*>(&_header));
		}

		iterator upper_bound(const key_type& key)
		{
			node_base* found = _upper_bound_node(key);
			return iterator(found ? found : &_header);
		}

		const_iterator upper_bound(const key_type& key) const
		{
			node_base* found = _upper_bound_node(key);
			return const_iterator(found ? found
				: const_cast<node_base*>(&_header));
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
		node_base _header;
		size_type _size;
		key_compare _comp;

		void _swap_tree_and_compare(map& other)
		{
			std::swap(_header.parent, other._header.parent);
			std::swap(_size, other._size);
			std::swap(_comp, other._comp);
			_refresh_header();
			other._refresh_header();
		}

		node_base* _root() const
		{
			return _header.parent;
		}

		static value_type& _value(node_base* current)
		{
			return static_cast<node*>(current)->value;
		}

		static const value_type& _value(const node_base* current)
		{
			return static_cast<const node*>(current)->value;
		}

		void _reset_header()
		{
			_header.parent = NULL;
			_header.left = &_header;
			_header.right = &_header;
			_header.red = false;
			_header.is_header = true;
		}

		void _refresh_header()
		{
			node_base* root = _root();
			if (root == NULL)
			{
				_reset_header();
				return;
			}
			root->parent = &_header;
			_header.left = _minimum(root);
			_header.right = _maximum(root);
		}

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

		void _destroy_node(node_base* n)
		{
			node* concrete = static_cast<node*>(n);
			_node_alloc.destroy(concrete);
			_node_alloc.deallocate(concrete, 1);
		}

		static node_base* _minimum(node_base* n)
		{
			if (n == NULL)
				return NULL;
			while (n->left)
				n = n->left;
			return n;
		}

		static node_base* _maximum(node_base* n)
		{
			if (n == NULL)
				return NULL;
			while (n->right)
				n = n->right;
			return n;
		}

		static node_base* _next(node_base* n)
		{
			if (n == NULL)
				return NULL;
			if (n->is_header)
				return n;
			if (n->right)
				return _minimum(n->right);
			node_base* parent = n->parent;
			while (!parent->is_header && n == parent->right)
			{
				n = parent;
				parent = parent->parent;
			}
			return parent;
		}

		static node_base* _previous(node_base* n)
		{
			if (n == NULL)
				return NULL;
			if (n->is_header)
				return n->right;
			if (n->left)
				return _maximum(n->left);
			node_base* parent = n->parent;
			while (!parent->is_header && n == parent->left)
			{
				n = parent;
				parent = parent->parent;
			}
			return parent;
		}

		static bool _is_red(node_base* n)
		{
			return n != NULL && n->red;
		}

		static bool _is_black(node_base* n)
		{
			return n == NULL || !n->red;
		}

		void _rotate_left(node_base* x)
		{
			node_base* y = x->right;
			x->right = y->left;
			if (y->left)
				y->left->parent = x;
			y->parent = x->parent;
			if (x->parent->is_header)
				_header.parent = y;
			else if (x == x->parent->left)
				x->parent->left = y;
			else
				x->parent->right = y;
			y->left = x;
			x->parent = y;
		}

		void _rotate_right(node_base* x)
		{
			node_base* y = x->left;
			x->left = y->right;
			if (y->right)
				y->right->parent = x;
			y->parent = x->parent;
			if (x->parent->is_header)
				_header.parent = y;
			else if (x == x->parent->right)
				x->parent->right = y;
			else
				x->parent->left = y;
			y->right = x;
			x->parent = y;
		}

		void _insert_fixup(node_base* z)
		{
			while (!z->parent->is_header && _is_red(z->parent))
			{
				if (z->parent == z->parent->parent->left)
				{
					node_base* uncle = z->parent->parent->right;
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
					node_base* uncle = z->parent->parent->left;
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
			if (_root())
				_root()->red = false;
		}

		node_base* _find_node(const key_type& key) const
		{
			node_base* cur = _root();
			while (cur)
			{
				if (_comp(key, _value(cur).first))
					cur = cur->left;
				else if (_comp(_value(cur).first, key))
					cur = cur->right;
				else
					return cur;
			}
			return NULL;
		}

		node_base* _lower_bound_node(const key_type& key) const
		{
			node_base* cur = _root();
			node_base* result = NULL;
			while (cur)
			{
				if (!_comp(_value(cur).first, key))
				{
					result = cur;
					cur = cur->left;
				}
				else
					cur = cur->right;
			}
			return result;
		}

		node_base* _upper_bound_node(const key_type& key) const
		{
			node_base* cur = _root();
			node_base* result = NULL;
			while (cur)
			{
				if (_comp(key, _value(cur).first))
				{
					result = cur;
					cur = cur->left;
				}
				else
					cur = cur->right;
			}
			return result;
		}

		void _transplant(node_base* old_node, node_base* new_node)
		{
			if (old_node->parent->is_header)
				_header.parent = new_node;
			else if (old_node == old_node->parent->left)
				old_node->parent->left = new_node;
			else
				old_node->parent->right = new_node;
			if (new_node)
				new_node->parent = old_node->parent;
		}

		void _erase_node(node_base* target)
		{
			node_base* moved = target;
			node_base* fix = NULL;
			node_base* fix_parent = NULL;
			bool moved_was_red = moved->red;
			if (target->left == NULL)
			{
				fix = target->right;
				fix_parent = target->parent;
				_transplant(target, target->right);
			}
			else if (target->right == NULL)
			{
				fix = target->left;
				fix_parent = target->parent;
				_transplant(target, target->left);
			}
			else
			{
				moved = _minimum(target->right);
				moved_was_red = moved->red;
				fix = moved->right;
				if (moved->parent == target)
				{
					fix_parent = moved;
					if (fix)
						fix->parent = moved;
				}
				else
				{
					fix_parent = moved->parent;
					_transplant(moved, moved->right);
					moved->right = target->right;
					moved->right->parent = moved;
				}
				_transplant(target, moved);
				moved->left = target->left;
				moved->left->parent = moved;
				moved->red = target->red;
			}
			_destroy_node(target);
			--_size;
			if (!moved_was_red)
				_erase_fixup(fix, fix_parent);
			if (_root())
				_root()->red = false;
			_refresh_header();
		}

		void _erase_fixup(node_base* x, node_base* parent)
		{
			while (x != _root() && _is_black(x))
			{
				if (x == (parent ? parent->left : NULL))
				{
					node_base* sibling = parent ? parent->right : NULL;
					if (_is_red(sibling))
					{
						sibling->red = false;
						parent->red = true;
						_rotate_left(parent);
						sibling = parent->right;
					}
					if (_is_black(sibling ? sibling->left : NULL)
						&& _is_black(sibling ? sibling->right : NULL))
					{
						if (sibling)
							sibling->red = true;
						x = parent;
						parent = x ? x->parent : NULL;
					}
					else
					{
						if (_is_black(sibling ? sibling->right : NULL))
						{
							if (sibling && sibling->left)
								sibling->left->red = false;
							if (sibling)
							{
								sibling->red = true;
								_rotate_right(sibling);
							}
							sibling = parent ? parent->right : NULL;
						}
						if (sibling)
							sibling->red = parent ? parent->red : false;
						if (parent)
							parent->red = false;
						if (sibling && sibling->right)
							sibling->right->red = false;
						if (parent)
							_rotate_left(parent);
						x = _root();
						parent = NULL;
					}
				}
				else
				{
					node_base* sibling = parent ? parent->left : NULL;
					if (_is_red(sibling))
					{
						sibling->red = false;
						parent->red = true;
						_rotate_right(parent);
						sibling = parent->left;
					}
					if (_is_black(sibling ? sibling->right : NULL)
						&& _is_black(sibling ? sibling->left : NULL))
					{
						if (sibling)
							sibling->red = true;
						x = parent;
						parent = x ? x->parent : NULL;
					}
					else
					{
						if (_is_black(sibling ? sibling->left : NULL))
						{
							if (sibling && sibling->right)
								sibling->right->red = false;
							if (sibling)
							{
								sibling->red = true;
								_rotate_left(sibling);
							}
							sibling = parent ? parent->left : NULL;
						}
						if (sibling)
							sibling->red = parent ? parent->red : false;
						if (parent)
							parent->red = false;
						if (sibling && sibling->left)
							sibling->left->red = false;
						if (parent)
							_rotate_right(parent);
						x = _root();
						parent = NULL;
					}
				}
			}
			if (x)
				x->red = false;
		}

		void _clear(node_base* n)
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
