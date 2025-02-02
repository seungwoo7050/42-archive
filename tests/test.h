#ifndef TEST_H
# define TEST_H

# include <stddef.h>

void	test_check(int condition, const char *expression, const char *file,
			int line);
int		test_finish(void);
void	test_reader(void);
void	test_boundaries(void);
void	test_context(void);
void	test_nonblocking(void);
void	test_threads(void);

# define CHECK(condition) \
	test_check((condition), #condition, __FILE__, __LINE__)

#endif
