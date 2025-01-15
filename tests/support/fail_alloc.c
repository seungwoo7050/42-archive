#include "tests/support/fail_alloc.h"

#include <stdlib.h>

#define TRACKED_LIMIT 4096

static void	*g_allocations[TRACKED_LIMIT];
static size_t	g_attempts;
static size_t	g_failure_index;
static size_t	g_live;
static size_t	g_invalid_frees;

void	test_allocator_reset(size_t failure_index)
{
	size_t	index;

	index = 0;
	while (index < TRACKED_LIMIT)
	{
		g_allocations[index] = NULL;
		index++;
	}
	g_attempts = 0;
	g_failure_index = failure_index;
	g_live = 0;
	g_invalid_frees = 0;
}

void	*test_malloc(size_t size)
{
	void	*allocation;
	size_t	index;

	g_attempts++;
	if (g_failure_index != 0 && g_attempts == g_failure_index)
		return (NULL);
	allocation = malloc(size);
	if (allocation == NULL)
		return (NULL);
	index = 0;
	while (index < TRACKED_LIMIT && g_allocations[index] != NULL)
		index++;
	if (index == TRACKED_LIMIT)
	{
		free(allocation);
		return (NULL);
	}
	g_allocations[index] = allocation;
	g_live++;
	return (allocation);
}

void	test_free(void *allocation)
{
	size_t	index;

	if (allocation == NULL)
		return ;
	index = 0;
	while (index < TRACKED_LIMIT && g_allocations[index] != allocation)
		index++;
	if (index == TRACKED_LIMIT)
	{
		g_invalid_frees++;
		return ;
	}
	g_allocations[index] = NULL;
	g_live--;
	free(allocation);
}

size_t	test_allocator_attempts(void)
{
	return (g_attempts);
}

size_t	test_allocator_live(void)
{
	return (g_live);
}

size_t	test_allocator_invalid_frees(void)
{
	return (g_invalid_frees);
}
