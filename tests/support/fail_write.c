#include "tests/support/fail_write.h"

#include <errno.h>
#include <string.h>

#define TEST_WRITE_LIMIT 64
#define TEST_OUTPUT_LIMIT 256

static const t_write_step	*g_steps;
static size_t				g_step_count;
static size_t				g_calls;
static int					g_fds[TEST_WRITE_LIMIT];
static size_t				g_requests[TEST_WRITE_LIMIT];
static char					g_output[TEST_OUTPUT_LIMIT];
static size_t				g_output_size;
static int					g_invalid;

void	test_writer_reset(const t_write_step *steps, size_t step_count)
{
	g_steps = steps;
	g_step_count = step_count;
	g_calls = 0;
	g_output_size = 0;
	g_invalid = 0;
}

ssize_t	test_write(int fd, const void *buffer, size_t length)
{
	t_write_step	step;
	size_t			current;

	current = g_calls;
	if (current >= TEST_WRITE_LIMIT || current >= g_step_count)
		return (g_invalid = 1, errno = EIO, -1);
	g_fds[current] = fd;
	g_requests[current] = length;
	g_calls++;
	step = g_steps[current];
	if (step.result < 0)
		return (errno = step.error_number, -1);
	if ((size_t)step.result > length
		|| (size_t)step.result > TEST_OUTPUT_LIMIT - g_output_size)
		return (g_invalid = 1, errno = EINVAL, -1);
	if (step.result > 0)
	{
		memcpy(g_output + g_output_size, buffer, (size_t)step.result);
		g_output_size += (size_t)step.result;
	}
	return (step.result);
}

size_t	test_writer_calls(void)
{
	return (g_calls);
}

int	test_writer_fd(size_t index)
{
	if (index >= g_calls)
		return (-1);
	return (g_fds[index]);
}

size_t	test_writer_request(size_t index)
{
	if (index >= g_calls)
		return (0);
	return (g_requests[index]);
}

const char	*test_writer_output(void)
{
	return (g_output);
}

size_t	test_writer_output_size(void)
{
	return (g_output_size);
}

int	test_writer_invalid(void)
{
	return (g_invalid);
}
