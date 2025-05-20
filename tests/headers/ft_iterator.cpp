#include "ft_iterator.hpp"

int main()
{
	int values[] = {4, 5};
	ft::reverse_iterator<int*> iterator(values + 2);
	return *iterator == 5 ? 0 : 1;
}
