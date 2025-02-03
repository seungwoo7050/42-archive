#ifndef METRIC_RUNTIME_H
# define METRIC_RUNTIME_H

# include <stddef.h>
# include <sys/types.h>

void	metric_reset(void);
size_t	metric_allocation_calls(void);
size_t	metric_allocation_bytes(void);
size_t	metric_copy_calls(void);
size_t	metric_copy_bytes(void);
size_t	metric_read_calls(void);
size_t	metric_read_bytes(void);

void	*metric_malloc(size_t size);
void	metric_free(void *pointer);
ssize_t	metric_read(int fd, void *buffer, size_t count);
void	metric_copy_observer(size_t length);

#endif
