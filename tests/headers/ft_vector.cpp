#include "ft_vector.hpp"

int main()
{
	ft::vector<int> values(3, 5);
	return values.size() == 3 && values.back() == 5 ? 0 : 1;
}
