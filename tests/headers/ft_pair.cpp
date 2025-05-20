#include "ft_pair.hpp"

int main()
{
	ft::pair<int, int> value = ft::make_pair(2, 7);
	return value.first == 2 && value.second == 7 ? 0 : 1;
}
