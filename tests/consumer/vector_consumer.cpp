#include "ft_vector.hpp"
#include "consumer_api.hpp"

int vector_consumer_result()
{
	ft::vector<int> values;
	for (int value = 1; value <= 5; ++value)
		values.push_back(value);
	values.insert(values.begin() + 2, 2, 7);
	int result = 0;
	for (ft::vector<int>::const_iterator it = values.begin();
		it != values.end(); ++it)
		result += *it;
	return result;
}
