#include "libft.h"

#include <stdlib.h>

int	main(void)
{
	char	*copy;
	t_list	*node;

	copy = ft_strdup("foundation");
	if (copy == NULL || ft_strlen(copy) != 10)
		return (free(copy), 1);
	node = ft_lstnew(copy);
	if (node == NULL)
		return (free(copy), 1);
	free(node->content);
	free(node);
	return (0);
}
