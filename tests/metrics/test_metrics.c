#define _POSIX_C_SOURCE 200809L

#include "metric_runtime.h"
#include "get_next_line.h"

#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <unistd.h>

#define INPUT_SIZE ((size_t)4 * 1024 * 1024)
#define BLOCK_SIZE ((size_t)8192)

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

static int	make_input(void)
{
	char	block[BLOCK_SIZE];
	char	path[] = "/tmp/buffered-line-metrics-XXXXXX";
	int		fd;
	size_t	index;
	size_t	written;

	index = 0;
	while (index < BLOCK_SIZE)
	{
		block[index] = (char)('a' + index % 26);
		index++;
	}
	fd = mkstemp(path);
	if (fd < 0)
		return (-1);
	unlink(path);
	written = 0;
	while (written < INPUT_SIZE)
	{
		if (!write_all(fd, block, BLOCK_SIZE))
		{
			close(fd);
			return (-1);
		}
		written += BLOCK_SIZE;
	}
	if (lseek(fd, 0, SEEK_SET) < 0)
	{
		close(fd);
		return (-1);
	}
	return (fd);
}

static unsigned long long	checksum(const char *bytes, size_t length)
{
	unsigned long long	hash;
	size_t				index;

	hash = 14695981039346656037ULL;
	index = 0;
	while (index < length)
	{
		hash ^= (unsigned char)bytes[index];
		hash *= 1099511628211ULL;
		index++;
	}
	return (hash);
}

static unsigned long long	elapsed_ns(struct timespec start,
		struct timespec end)
{
	return ((unsigned long long)(end.tv_sec - start.tv_sec) * 1000000000ULL
		+ (unsigned long long)(end.tv_nsec - start.tv_nsec));
}

int	main(void)
{
	char			*line;
	int				fd;
	size_t			length;
	struct timespec	finished;
	struct timespec	started;
	t_blr_reader	*reader;

	fd = make_input();
	if (fd < 0)
		return (1);
	metric_reset();
	clock_gettime(CLOCK_MONOTONIC, &started);
	reader = blr_reader_create(fd);
	if (reader == NULL || blr_reader_next(reader, &line) != BLR_LINE)
	{
		blr_reader_destroy(reader);
		close(fd);
		return (1);
	}
	clock_gettime(CLOCK_MONOTONIC, &finished);
	length = 0;
	while (line[length] != '\0')
		length++;
	printf("input_bytes=%zu\n", INPUT_SIZE);
	printf("line_bytes=%zu\n", length);
	printf("checksum=%llu\n", checksum(line, length));
	printf("read_calls=%zu\n", metric_read_calls());
	printf("read_bytes=%zu\n", metric_read_bytes());
	printf("allocation_calls=%zu\n", metric_allocation_calls());
	printf("allocation_bytes=%zu\n", metric_allocation_bytes());
	printf("copy_calls=%zu\n", metric_copy_calls());
	printf("copy_bytes=%zu\n", metric_copy_bytes());
	fprintf(stderr, "wall_ns=%llu (informational)\n",
		elapsed_ns(started, finished));
	metric_free(line);
	blr_reader_destroy(reader);
	close(fd);
	return (length != INPUT_SIZE);
}
