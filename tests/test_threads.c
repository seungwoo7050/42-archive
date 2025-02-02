#define _POSIX_C_SOURCE 200809L

#include "test.h"

#include "get_next_line.h"

#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define THREAD_COUNT 4

typedef struct s_thread_case
{
	int			fd;
	const char	*first;
	const char	*second;
	int			passed;
}	t_thread_case;

static int	write_all(int fd, const char *bytes, size_t length)
{
	ssize_t	written;

	while (length > 0)
	{
		written = write(fd, bytes, length);
		if (written <= 0)
			return (0);
		bytes += written;
		length -= (size_t)written;
	}
	return (1);
}

static int	reader_for(const char *bytes)
{
	int	fds[2];

	if (pipe(fds) != 0)
		return (-1);
	if (!write_all(fds[1], bytes, strlen(bytes)))
	{
		close(fds[0]);
		close(fds[1]);
		return (-1);
	}
	close(fds[1]);
	return (fds[0]);
}

static int	matches_next(t_blr_reader *reader, const char *expected)
{
	char	*line;
	int		matches;

	if (blr_reader_next(reader, &line) != BLR_LINE || line == NULL)
		return (0);
	matches = strcmp(line, expected) == 0;
	free(line);
	return (matches);
}

static void	*consume_context(void *argument)
{
	char			*line;
	t_thread_case	*test_case;
	t_blr_reader	*reader;

	test_case = argument;
	reader = blr_reader_create(test_case->fd);
	if (reader == NULL)
		return (NULL);
	test_case->passed = matches_next(reader, test_case->first)
		&& matches_next(reader, test_case->second)
		&& blr_reader_next(reader, &line) == BLR_EOF
		&& line == NULL;
	blr_reader_destroy(reader);
	return (NULL);
}

void	test_threads(void)
{
	const char		*inputs[THREAD_COUNT];
	const char		*first[THREAD_COUNT];
	const char		*second[THREAD_COUNT];
	int				created[THREAD_COUNT];
	size_t			index;
	pthread_t		threads[THREAD_COUNT];
	t_thread_case	cases[THREAD_COUNT];

	inputs[0] = "alpha one\nalpha two";
	inputs[1] = "beta one\nbeta two";
	inputs[2] = "gamma one\ngamma two";
	inputs[3] = "delta one\ndelta two";
	first[0] = "alpha one\n";
	first[1] = "beta one\n";
	first[2] = "gamma one\n";
	first[3] = "delta one\n";
	second[0] = "alpha two";
	second[1] = "beta two";
	second[2] = "gamma two";
	second[3] = "delta two";
	index = 0;
	while (index < THREAD_COUNT)
	{
		cases[index].fd = reader_for(inputs[index]);
		cases[index].first = first[index];
		cases[index].second = second[index];
		cases[index].passed = 0;
		created[index] = 0;
		CHECK(cases[index].fd >= 0);
		if (cases[index].fd >= 0)
		{
			created[index] = pthread_create(&threads[index], NULL,
					consume_context, &cases[index]) == 0;
			CHECK(created[index]);
		}
		index++;
	}
	index = 0;
	while (index < THREAD_COUNT)
	{
		if (created[index])
		{
			CHECK(pthread_join(threads[index], NULL) == 0);
			CHECK(cases[index].passed);
		}
		if (cases[index].fd >= 0)
			close(cases[index].fd);
		index++;
	}
}
