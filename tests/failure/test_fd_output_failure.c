#include "libft.h"
#include "tests/support/fail_write.h"

#include <errno.h>
#include <limits.h>
#include <stdio.h>
#include <string.h>

static int	g_checks;
static int	g_failures;

#define VERIFY(expression) verify((expression), #expression, __LINE__)

static void	verify(int condition, const char *expression, int line)
{
	g_checks++;
	if (!condition)
	{
		g_failures++;
		fprintf(stderr, "write failure test line %d: %s\n", line, expression);
	}
}

static void	check_partial_and_interrupted_write(void)
{
	static const t_write_step	steps[] = {
	{2, 0}, {-1, EINTR}, {1, 0}, {3, 0}};

	test_writer_reset(steps, sizeof(steps) / sizeof(steps[0]));
	ft_putstr_fd("abcdef", 91);
	VERIFY(test_writer_calls() == 4);
	VERIFY(test_writer_fd(0) == 91 && test_writer_fd(3) == 91);
	VERIFY(test_writer_request(0) == 6);
	VERIFY(test_writer_request(1) == 4);
	VERIFY(test_writer_request(2) == 4);
	VERIFY(test_writer_request(3) == 3);
	VERIFY(test_writer_output_size() == 6);
	VERIFY(memcmp(test_writer_output(), "abcdef", 6) == 0);
	VERIFY(test_writer_invalid() == 0);
}

static void	check_zero_write_stops(void)
{
	static const t_write_step	steps[] = {{2, 0}, {0, 0}, {4, 0}};

	test_writer_reset(steps, sizeof(steps) / sizeof(steps[0]));
	errno = EDOM;
	ft_putstr_fd("abcdef", 17);
	VERIFY(test_writer_calls() == 2);
	VERIFY(test_writer_request(0) == 6);
	VERIFY(test_writer_request(1) == 4);
	VERIFY(test_writer_output_size() == 2);
	VERIFY(memcmp(test_writer_output(), "ab", 2) == 0);
	VERIFY(test_writer_invalid() == 0);
	VERIFY(errno == EIO);
}

static void	check_permanent_error_stops(void)
{
	static const t_write_step	steps[] = {{1, 0}, {-1, EIO}, {5, 0}};

	test_writer_reset(steps, sizeof(steps) / sizeof(steps[0]));
	errno = 0;
	ft_putendl_fd("error", 23);
	VERIFY(test_writer_calls() == 2);
	VERIFY(test_writer_request(0) == 5);
	VERIFY(test_writer_request(1) == 4);
	VERIFY(test_writer_output_size() == 1);
	VERIFY(memcmp(test_writer_output(), "e", 1) == 0);
	VERIFY(test_writer_invalid() == 0);
	VERIFY(errno == EIO);
}

static void	check_number_retries_remaining_bytes(void)
{
	static const char			expected[] = "-2147483648";
	static const t_write_step	steps[] = {
	{1, 0}, {1, 0}, {-1, EINTR}, {1, 0}, {1, 0}, {1, 0},
	{1, 0}, {1, 0}, {1, 0}, {1, 0}, {1, 0}, {1, 0}};

	test_writer_reset(steps, sizeof(steps) / sizeof(steps[0]));
	ft_putnbr_fd(INT_MIN, 29);
	VERIFY(test_writer_calls() == 12);
	VERIFY(test_writer_request(0) == 1);
	VERIFY(test_writer_request(2) == 1);
	VERIFY(test_writer_request(11) == 1);
	VERIFY(test_writer_output_size() == sizeof(expected) - 1);
	VERIFY(memcmp(test_writer_output(), expected, sizeof(expected) - 1) == 0);
	VERIFY(test_writer_invalid() == 0);
}

static void	check_number_stops_after_error(void)
{
	static const t_write_step	steps[] = {
	{1, 0}, {1, 0}, {-1, EPIPE}, {1, 0}};

	test_writer_reset(steps, sizeof(steps) / sizeof(steps[0]));
	errno = 0;
	ft_putnbr_fd(INT_MIN, 31);
	VERIFY(test_writer_calls() == 3);
	VERIFY(test_writer_output_size() == 2);
	VERIFY(memcmp(test_writer_output(), "-2", 2) == 0);
	VERIFY(test_writer_invalid() == 0);
	VERIFY(errno == EPIPE);
}

int	main(void)
{
	check_partial_and_interrupted_write();
	check_zero_write_stops();
	check_permanent_error_stops();
	check_number_retries_remaining_bytes();
	check_number_stops_after_error();
	if (g_failures != 0)
	{
		fprintf(stderr, "%d of %d write failure checks failed\n",
			g_failures, g_checks);
		return (1);
	}
	printf("%d write failure checks passed\n", g_checks);
	return (0);
}
