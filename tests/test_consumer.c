#include "ft_printf.h"

int	main(void)
{
	if (ft_printf("consumer:%d:%s\n", 17, "ok") != 15)
		return (1);
	return (0);
}
