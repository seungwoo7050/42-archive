#ifndef TESTS_SUPPORT_MAP_INSPECTOR_HPP
# define TESTS_SUPPORT_MAP_INSPECTOR_HPP

# include <algorithm>
# include <cstddef>
# include <sstream>
# include <string>
# include "ft_map.hpp"

namespace ft
{
	namespace detail
	{
		struct map_validation
		{
			bool valid;
			std::string message;
			std::size_t node_count;
			std::size_t height;
			std::size_t black_height;

			map_validation()
				: valid(true), message(), node_count(0), height(0),
				  black_height(0)
			{
			}
		};

		template <class Key, class T, class Compare, class Alloc>
		struct map_inspector<ft::map<Key, T, Compare, Alloc> >
		{
			typedef ft::map<Key, T, Compare, Alloc> map_type;
			typedef typename map_type::node_base node_base;
			typedef typename map_type::key_type key_type;

			static map_validation validate(const map_type& values)
			{
				map_validation result;
				const node_base* header = &values._header;
				if (!header->is_header)
					return _fail("header flag is not set");
				if (header->red)
					return _fail("header must be black");
				if (values._size == 0)
				{
					if (header->parent != NULL)
						return _fail("empty header has a root");
					if (header->left != header || header->right != header)
						return _fail("empty header extrema do not self-reference");
					result.black_height = 1;
					return result;
				}

				const node_base* root = header->parent;
				if (root == NULL)
					return _fail("non-empty map has no root");
				if (root->parent != header)
					return _fail("root does not point to header");
				if (root->red)
					return _fail("root must be black");
				if (_minimum(root) != header->left)
					return _fail("header minimum is stale");
				if (_maximum(root) != header->right)
					return _fail("header maximum is stale");

				result = _validate_subtree(values, root, header, NULL, NULL);
				if (result.valid && result.node_count != values._size)
				{
					std::ostringstream message;
					message << "reachable node count " << result.node_count
						<< " differs from size " << values._size;
					return _fail(message.str());
				}
				return result;
			}

			static const key_type& root_key(const map_type& values)
			{
				return map_type::_value(values._header.parent).first;
			}

		private:
			static map_validation _fail(const std::string& message)
			{
				map_validation result;
				result.valid = false;
				result.message = message;
				return result;
			}

			static const node_base* _minimum(const node_base* current)
			{
				while (current->left != NULL)
					current = current->left;
				return current;
			}

			static const node_base* _maximum(const node_base* current)
			{
				while (current->right != NULL)
					current = current->right;
				return current;
			}

			static map_validation _validate_subtree(const map_type& values,
				const node_base* current, const node_base* expected_parent,
				const key_type* lower, const key_type* upper)
			{
				if (current == NULL)
				{
					map_validation leaf;
					leaf.black_height = 1;
					return leaf;
				}
				if (current->is_header)
					return _fail("header is reachable as a child");
				if (current->parent != expected_parent)
					return _fail("child and parent links disagree");

				const key_type& key = map_type::_value(current).first;
				if (lower != NULL && !values._comp(*lower, key))
					return _fail("key is not greater than its lower bound");
				if (upper != NULL && !values._comp(key, *upper))
					return _fail("key is not less than its upper bound");
				if (current->red
					&& ((current->left != NULL && current->left->red)
						|| (current->right != NULL && current->right->red)))
					return _fail("red node has a red child");

				map_validation left = _validate_subtree(values, current->left,
					current, lower, &key);
				if (!left.valid)
					return left;
				map_validation right = _validate_subtree(values, current->right,
					current, &key, upper);
				if (!right.valid)
					return right;
				if (left.black_height != right.black_height)
					return _fail("black heights differ");

				map_validation result;
				result.node_count = left.node_count + right.node_count + 1;
				result.height = std::max(left.height, right.height) + 1;
				result.black_height = left.black_height + (current->red ? 0 : 1);
				return result;
			}
		};
	}
}

#endif
