#include "libft.h"
#include "tests/support/fail_alloc.h"

#include <stdio.h>
#include <stdlib.h>

static int	g_checks;
static int	g_failures;
static int	g_content_deletes;

#define VERIFY(expression) verify((expression), #expression, __LINE__)

static void	verify(int condition, const char *expression, int line)
{
	g_checks++;
	if (!condition)
	{
		g_failures++;
		fprintf(stderr, "failure test line %d: %s\n", line, expression);
	}
}

static char	identity_character(unsigned int index, char character)
{
	(void)index;
	return (character);
}

static void	check_single_allocation_failures(void)
{
	t_list	*node;

	test_allocator_reset(1);
	VERIFY(ft_calloc(4, 8) == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_strdup("owned") == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_substr("owned", 1, 3) == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_strjoin("left", "right") == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_strtrim("  text  ", " ") == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_itoa(-42) == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	VERIFY(ft_strmapi("map", identity_character) == NULL);
	VERIFY(test_allocator_live() == 0);
	test_allocator_reset(1);
	node = ft_lstnew((void *)"content");
	VERIFY(node == NULL);
	VERIFY(test_allocator_live() == 0);
}

static void	free_failure_split(char **fields)
{
	size_t	index;

	index = 0;
	while (fields[index] != NULL)
	{
		test_free(fields[index]);
		index++;
	}
	test_free(fields);
}

static void	check_split_failures(void)
{
	char	**fields;
	size_t	allocation_count;
	size_t	failure_index;

	test_allocator_reset(0);
	fields = ft_split("alpha,beta,gamma,delta", ',');
	VERIFY(fields != NULL);
	allocation_count = test_allocator_attempts();
	if (fields != NULL)
		free_failure_split(fields);
	VERIFY(allocation_count == 5);
	VERIFY(test_allocator_live() == 0);
	failure_index = 1;
	while (failure_index <= allocation_count)
	{
		test_allocator_reset(failure_index);
		fields = ft_split("alpha,beta,gamma,delta", ',');
		VERIFY(fields == NULL);
		VERIFY(test_allocator_live() == 0);
		VERIFY(test_allocator_invalid_frees() == 0);
		failure_index++;
	}
}

static void	*map_integer(void *content)
{
	int	*mapped;

	mapped = malloc(sizeof(int));
	if (mapped != NULL)
		*mapped = *(int *)content + 10;
	return (mapped);
}

static void	delete_map_content(void *content)
{
	g_content_deletes++;
	free(content);
}

static void	check_list_map_failures(void)
{
	int		values[3];
	t_list		source[3];
	t_list		*mapped;
	size_t		failure_index;

	values[0] = 1;
	values[1] = 2;
	values[2] = 3;
	source[0].content = &values[0];
	source[0].next = &source[1];
	source[1].content = &values[1];
	source[1].next = &source[2];
	source[2].content = &values[2];
	source[2].next = NULL;
	test_allocator_reset(0);
	g_content_deletes = 0;
	mapped = ft_lstmap(source, map_integer, delete_map_content);
	VERIFY(mapped != NULL);
	VERIFY(test_allocator_attempts() == 3);
	if (mapped != NULL)
		ft_lstclear(&mapped, delete_map_content);
	VERIFY(g_content_deletes == 3);
	VERIFY(test_allocator_live() == 0);
	failure_index = 1;
	while (failure_index <= 3)
	{
		test_allocator_reset(failure_index);
		g_content_deletes = 0;
		mapped = ft_lstmap(source, map_integer, delete_map_content);
		VERIFY(mapped == NULL);
		VERIFY(g_content_deletes == (int)failure_index);
		VERIFY(test_allocator_live() == 0);
		VERIFY(test_allocator_invalid_frees() == 0);
		VERIFY(values[0] == 1 && values[1] == 2 && values[2] == 3);
		failure_index++;
	}
}

int	main(void)
{
	check_single_allocation_failures();
	check_split_failures();
	check_list_map_failures();
	if (g_failures != 0)
	{
		fprintf(stderr, "%d of %d failure checks failed\n",
			g_failures, g_checks);
		return (1);
	}
	printf("%d allocation failure checks passed\n", g_checks);
	return (0);
}
