#include "ft_stack.hpp"

int main()
{
	ft::stack<int> values;
	values.push(9);
	return values.top() == 9 ? 0 : 1;
}
