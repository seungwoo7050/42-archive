#define _POSIX_C_SOURCE 200809L

#include "minitalk.h"

#include <errno.h>
#include <signal.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static volatile sig_atomic_t	g_stop;

static void	handle_stop(int signal)
{
	(void)signal;
	g_stop = 1;
}

static int	install_stop_handlers(void)
{
	struct sigaction	action;

	action.sa_handler = handle_stop;
	sigemptyset(&action.sa_mask);
	action.sa_flags = 0;
	if (sigaction(SIGHUP, &action, NULL) == -1
		|| sigaction(SIGINT, &action, NULL) == -1
		|| sigaction(SIGTERM, &action, NULL) == -1)
		return (-1);
	return (0);
}

static int	child_exited_unreaped(pid_t child)
{
	siginfo_t	info;

	info.si_pid = 0;
	if (waitid(P_PID, (id_t)child, &info, WEXITED | WNOHANG | WNOWAIT) == -1)
		return (-1);
	return (info.si_pid == child);
}

static int	wait_for_unreaped_child(pid_t child, const char *client_path)
{
	struct timespec	pause_time;
	struct stat		info;
	int				tries;
	int				status;

	tries = 0;
	while (tries < 50)
	{
		status = child_exited_unreaped(child);
		if (status == -1)
			return (-1);
		if (status == 1 && lstat(client_path, &info) == -1 && errno == ENOENT)
			return (0);
		pause_time.tv_sec = 0;
		pause_time.tv_nsec = 100000000L;
		while (nanosleep(&pause_time, &pause_time) == -1 && errno == EINTR)
			;
		tries++;
	}
	return (-1);
}

int	main(int argc, char **argv)
{
	char	client_path[MT_RESPONSE_PATH_SIZE];
	char	*child_argv[4];
	pid_t	child;

	if (argc != 3 || install_stop_handlers() == -1)
		return (2);
	child = fork();
	if (child == -1)
		return (1);
	if (child == 0)
	{
		child_argv[0] = argv[1];
		child_argv[1] = argv[2];
		child_argv[2] = "partial";
		child_argv[3] = NULL;
		execv(argv[1], child_argv);
		_exit(127);
	}
	if (mt_response_path(client_path, sizeof(client_path), "client", child) == -1
		|| wait_for_unreaped_child(child, client_path) == -1)
	{
		kill(child, SIGKILL);
		waitpid(child, NULL, 0);
		return (1);
	}
	mt_putnbr_fd(child, STDOUT_FILENO);
	mt_write_all(STDOUT_FILENO, "\n", 1);
	while (!g_stop)
		pause();
	while (waitpid(child, NULL, 0) == -1 && errno == EINTR)
		;
	return (0);
}
