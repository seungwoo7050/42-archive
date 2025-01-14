#ifndef FAIL_WRITE_H
# define FAIL_WRITE_H

# include <stddef.h>
# include <sys/types.h>

typedef struct s_write_step
{
	ssize_t	result;
	int		error_number;
}	t_write_step;

void		test_writer_reset(const t_write_step *steps, size_t step_count);
ssize_t		test_write(int fd, const void *buffer, size_t length);
size_t		test_writer_calls(void);
int			test_writer_fd(size_t index);
size_t		test_writer_request(size_t index);
const char	*test_writer_output(void);
size_t		test_writer_output_size(void);
int			test_writer_invalid(void);

#endif
