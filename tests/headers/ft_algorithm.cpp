#include "ft_algorithm.hpp"

int main()
{
	int lhs[] = {1, 2};
	int rhs[] = {1, 3};
	return ft::equal(lhs, lhs + 1, rhs)
		&& ft::lexicographical_compare(lhs, lhs + 2, rhs, rhs + 2) ? 0 : 1;
}
