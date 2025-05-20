#include "ft_map.hpp"

int main()
{
	ft::map<int, int> values;
	values.insert(ft::make_pair(2, 6));
	return values.find(2)->second == 6 ? 0 : 1;
}
