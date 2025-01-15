#ifndef FAIL_ALLOC_H
# define FAIL_ALLOC_H

# include <stddef.h>

void	*test_malloc(size_t size);
void	test_free(void *allocation);
void	test_allocator_reset(size_t failure_index);
size_t	test_allocator_attempts(void);
size_t	test_allocator_live(void);
size_t	test_allocator_invalid_frees(void);

#endif
