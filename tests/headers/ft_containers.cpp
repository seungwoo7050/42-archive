#include "ft_containers.hpp"

int main()
{
	ft::vector<int> values(2, 3);
	ft::stack<int> pending;
	ft::map<int, int> indexed;
	pending.push(values.front());
	indexed.insert(ft::make_pair(1, pending.top()));
	return indexed.begin()->second == 3 ? 0 : 1;
}
