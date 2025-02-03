#include "metric_runtime.h"

#include <stdlib.h>
#include <unistd.h>

static size_t	g_allocation_calls;
static size_t	g_allocation_bytes;
static size_t	g_copy_calls;
static size_t	g_copy_bytes;
static size_t	g_read_calls;
static size_t	g_read_bytes;

void	metric_reset(void)
{
	g_allocation_calls = 0;
	g_allocation_bytes = 0;
	g_copy_calls = 0;
	g_copy_bytes = 0;
	g_read_calls = 0;
	g_read_bytes = 0;
}

size_t	metric_allocation_calls(void)
{
	return (g_allocation_calls);
}

size_t	metric_allocation_bytes(void)
{
	return (g_allocation_bytes);
}

size_t	metric_copy_calls(void)
{
	return (g_copy_calls);
}

size_t	metric_copy_bytes(void)
{
	return (g_copy_bytes);
}

size_t	metric_read_calls(void)
{
	return (g_read_calls);
}

size_t	metric_read_bytes(void)
{
	return (g_read_bytes);
}

void	*metric_malloc(size_t size)
{
	g_allocation_calls++;
	g_allocation_bytes += size;
	return (malloc(size));
}

void	metric_free(void *pointer)
{
	free(pointer);
}

ssize_t	metric_read(int fd, void *buffer, size_t count)
{
	ssize_t	read_size;

	if (count > 0)
		g_read_calls++;
	read_size = read(fd, buffer, count);
	if (count > 0 && read_size > 0)
		g_read_bytes += (size_t)read_size;
	return (read_size);
}

void	metric_copy_observer(size_t length)
{
	g_copy_calls++;
	g_copy_bytes += length;
}
