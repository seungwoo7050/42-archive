#include "test.h"

#include "get_next_line.h"

#include <fcntl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static int	make_nonblocking_pipe(int fds[2])
{
	int	flags;

	if (pipe(fds) != 0)
		return (0);
	flags = fcntl(fds[0], F_GETFL);
	if (flags < 0 || fcntl(fds[0], F_SETFL, flags | O_NONBLOCK) < 0)
	{
		close(fds[0]);
		close(fds[1]);
		return (0);
	}
	return (1);
}

static void	test_context_preserves_partial_nonblocking_input(void)
{
	char			*line;
	int				fds[2];
	int				opened;
	t_blr_reader	*reader;

	opened = make_nonblocking_pipe(fds);
	CHECK(opened);
	if (!opened)
		return ;
	reader = blr_reader_create(fds[0]);
	CHECK(reader != NULL);
	if (reader == NULL)
	{
		close(fds[0]);
		close(fds[1]);
		return ;
	}
	CHECK(write(fds[1], "part", 4) == 4);
	line = (char *)reader;
	CHECK(blr_reader_next(reader, &line) == BLR_AGAIN);
	CHECK(line == NULL);
	CHECK(write(fds[1], "ial\nnext", 8) == 8);
	CHECK(blr_reader_next(reader, &line) == BLR_LINE);
	CHECK(line != NULL && strcmp(line, "partial\n") == 0);
	free(line);
	CHECK(blr_reader_next(reader, &line) == BLR_AGAIN);
	CHECK(line == NULL);
	close(fds[1]);
	CHECK(blr_reader_next(reader, &line) == BLR_LINE);
	CHECK(line != NULL && strcmp(line, "next") == 0);
	free(line);
	CHECK(blr_reader_next(reader, &line) == BLR_EOF);
	CHECK(line == NULL);
	blr_reader_destroy(reader);
	close(fds[0]);
}

static void	test_compatibility_wrapper_keeps_waiting_state(void)
{
	char	*line;
	int		fds[2];
	int		opened;

	opened = make_nonblocking_pipe(fds);
	CHECK(opened);
	if (!opened)
		return ;
	CHECK(write(fds[1], "leg", 3) == 3);
	CHECK(get_next_line(fds[0]) == NULL);
	CHECK(write(fds[1], "acy\n", 4) == 4);
	line = get_next_line(fds[0]);
	CHECK(line != NULL && strcmp(line, "legacy\n") == 0);
	free(line);
	close(fds[1]);
	CHECK(get_next_line(fds[0]) == NULL);
	close(fds[0]);
}

void	test_nonblocking(void)
{
	test_context_preserves_partial_nonblocking_input();
	test_compatibility_wrapper_keeps_waiting_state();
}
