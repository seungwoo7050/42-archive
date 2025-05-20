#include "ft_map.hpp"
#include "consumer_api.hpp"

int map_consumer_result()
{
	ft::map<int, int> values;
	values.insert(ft::make_pair(3, 30));
	values.insert(ft::make_pair(1, 10));
	values.insert(ft::make_pair(2, 20));
	values.erase(1);
	int result = 0;
	for (ft::map<int, int>::const_iterator it = values.begin();
		it != values.end(); ++it)
		result += it->first + it->second;
	return result;
}
