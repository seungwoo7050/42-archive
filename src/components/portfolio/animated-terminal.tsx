"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfileContent, TerminalPresentation } from "@/lib/portfolio";

function formatTerminalLine(
  line: string,
  {
    profile,
    projectCount,
    stackCount,
  }: {
    profile: ProfileContent;
    projectCount: number;
    stackCount: number;
  },
) {
  return line
    .replaceAll("{handle}", profile.handle.toLowerCase())
    .replaceAll("{role}", profile.role.toLowerCase())
    .replaceAll("{location}", profile.location)
    .replaceAll("{projectCount}", String(projectCount))
    .replaceAll("{stackCount}", String(stackCount));
}

export function AnimatedTerminal({
  profile,
  projectCount,
  stackCount,
  terminal,
}: {
  profile: ProfileContent;
  projectCount: number;
  stackCount: number;
  terminal: TerminalPresentation;
}) {
  const commands = useMemo(
    () =>
      terminal.commands.map((command) => ({
        ...command,
        output: command.output.map((line) =>
          formatTerminalLine(line, { profile, projectCount, stackCount }),
        ),
      })),
    [profile, projectCount, stackCount, terminal.commands],
  );
  const [commandIndex, setCommandIndex] = useState(0);
  const [typedCommand, setTypedCommand] = useState(commands[0]?.command ?? "");
  const [phase, setPhase] = useState<"typing" | "hold" | "erase">("hold");
  const activeCommand = commands[commandIndex];

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (typedCommand.length < activeCommand.command.length) {
        timeout = setTimeout(() => {
          setTypedCommand(activeCommand.command.slice(0, typedCommand.length + 1));
        }, 42);
      } else {
        timeout = setTimeout(() => setPhase("hold"), 520);
      }
    }

    if (phase === "hold") {
      timeout = setTimeout(() => setPhase("erase"), 1700);
    }

    if (phase === "erase") {
      if (typedCommand.length > 0) {
        timeout = setTimeout(() => {
          setTypedCommand(activeCommand.command.slice(0, typedCommand.length - 1));
        }, 24);
      } else {
        timeout = setTimeout(() => {
          setCommandIndex((current) => (current + 1) % commands.length);
          setPhase("typing");
        }, 220);
      }
    }

    return () => clearTimeout(timeout);
  }, [activeCommand.command, commands.length, phase, typedCommand]);

  const shouldShowOutput = phase !== "typing" || typedCommand === activeCommand.command;

  return (
    <aside
      aria-label="Animated portfolio terminal preview"
      className="terminal-window mx-auto w-full max-w-xl"
    >
      <div className="terminal-titlebar">
        <span className="bg-[#ff6b5f]" />
        <span className="bg-[#f6c76f]" />
        <span className="bg-[#67d391]" />
        <p>{terminal.title}</p>
      </div>
      <div className="terminal-body">
        <p className="terminal-line text-muted">
          {terminal.bootLine}
        </p>
        <p className="terminal-line">
          <span className="text-accent">{terminal.promptUser}</span>
          <span className="text-muted">:</span>
          <span className="text-signal">{terminal.promptPath}</span>
          <span className="text-muted">$ </span>
          <span>{typedCommand}</span>
          <span aria-hidden="true" className="terminal-caret" />
        </p>
        <div className="mt-4 min-h-[4.75rem] space-y-2">
          {shouldShowOutput
            ? activeCommand.output.map((line) => (
                <p className="terminal-line terminal-output" key={line}>
                  {line}
                </p>
              ))
            : null}
        </div>
      </div>
    </aside>
  );
}
