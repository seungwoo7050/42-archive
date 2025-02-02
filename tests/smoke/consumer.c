#include "get_next_line.h"

#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int	check_explicit_reader(const char *path)
{
	char			*line;
	int				fd;
	int				passed;
	t_blr_result	result;
	t_blr_reader	*reader;

	fd = open(path, O_RDONLY);
	if (fd < 0)
		return (0);
	reader = blr_reader_create(fd);
	if (reader == NULL)
	{
		close(fd);
		return (0);
	}
	result = blr_reader_next(reader, &line);
	passed = result == BLR_LINE && line != NULL
		&& strcmp(line, "outside\n") == 0;
	free(line);
	result = blr_reader_next(reader, &line);
	passed = passed && result == BLR_LINE && line != NULL
		&& strcmp(line, "archive") == 0;
	free(line);
	result = blr_reader_next(reader, &line);
	passed = passed && result == BLR_EOF && line == NULL;
	blr_reader_destroy(reader);
	close(fd);
	return (passed);
}

static int	check_compatibility_reader(const char *path)
{
	char	*line;
	int		fd;
	int		passed;

	fd = open(path, O_RDONLY);
	if (fd < 0)
		return (0);
	line = get_next_line(fd);
	passed = line != NULL && strcmp(line, "outside\n") == 0;
	free(line);
	line = get_next_line(fd);
	passed = passed && line != NULL && strcmp(line, "archive") == 0;
	free(line);
	passed = passed && get_next_line(fd) == NULL;
	close(fd);
	return (passed);
}

int	main(int argc, char **argv)
{
	if (argc != 2)
		return (2);
	if (!check_explicit_reader(argv[1])
		|| !check_compatibility_reader(argv[1]))
		return (1);
	return (0);
}
