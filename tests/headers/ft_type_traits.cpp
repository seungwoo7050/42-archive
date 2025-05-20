#include "ft_type_traits.hpp"

int main()
{
	return ft::is_integral<int>::value
		&& !ft::is_integral<float>::value ? 0 : 1;
}
