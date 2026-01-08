import { parseArgs } from "@std/cli";
import { execCommand } from "./process.ts";
import { mergeReadableStreams, toTransformStream } from "@std/streams";

/** Result of the execution - if execution started and all commands have succeeded (exit code 0) */
export type SimultaResult = { success: true } | {
  success: false;
  error: string | null;
};

const resetEscapeCode = "\x1b[0m";

const outputTransformer = (params: { prefix: string | null }) => {
  const firstLinePrefix = params.prefix ? `${params.prefix} │ ` : "";
  const otherLinePrefix = params.prefix
    ? `${" ".repeat(params.prefix.length)} │ `
    : "";

  return async function* (stream: ReadableStream<string>) {
    for await (const chunk of stream) {
      const lines = chunk.split("\n").filter((line) => line.length !== 0);
      if (lines.length === 0) {
        continue;
      }

      let output = "";

      output += `${firstLinePrefix}${lines[0]}${resetEscapeCode}`;
      for (let i = 1; i < lines.length; i += 1) {
        output += `\n${otherLinePrefix}${lines[i]}${resetEscapeCode}`;
      }
      output += "\n";

      yield output;
    }
  };
};

/**
 * Run multiple commands simultanously.
 * All commands are run through shell.
 *
 * @note each line ends with styling reset escape code
 */
export const simulta = async (params: {
  /** List of commands and arguments */
  commands: string[];
  /** steam to which stdout from processes will be written */
  stdout: WritableStream;
  /** stream to which stderr from processes will be written */
  stderr: WritableStream;
  /** List of command names - works only with prefix: true, and has to correspond to number of commands */
  names?: string[];
  /** If commands should be prefixed - by default using index, using names if names are provided */
  prefix?: boolean;
}): Promise<SimultaResult> => {
  if (params.commands.length === 0) {
    return { success: false, error: "No command provided" };
  }

  if (params.names && params.names.length !== params.commands.length) {
    return {
      success: false,
      error:
        `--names options provided, but ${params.names.length} names were given for ${params.commands.length} commands`,
    };
  }

  const processes = params.commands.map(execCommand);

  const commandNames = params.names
    ? params.names
    : params.commands.map((_cmd, i) => i.toString());
  const longestCommandNameLength = Math.max(
    ...commandNames.map((name) => name.length),
    0,
  );

  const prefixes = commandNames.map((name) => {
    // +2 for braces [ ]
    return `[${name}]`.padEnd(longestCommandNameLength + 2, " ");
  });

  const pipeline = (
    stream: ReadableStream,
    payload: { index: number },
  ): ReadableStream => {
    return stream
      .pipeThrough(new TextDecoderStream())
      // .pipeThrough(new TextLineStream())
      .pipeThrough(
        toTransformStream(outputTransformer({
          // correctness ensured by checking length of names against commands
          prefix: params.prefix ? prefixes.at(payload.index)! : null,
        })),
      )
      .pipeThrough(new TextEncoderStream());
  };

  await Promise.all([
    mergeReadableStreams(
      ...processes.map((process, i) => pipeline(process.stdout, { index: i })),
    ).pipeTo(params.stdout),
    mergeReadableStreams(
      ...processes.map((process, i) => pipeline(process.stderr, { index: i })),
    ).pipeTo(params.stderr),
  ]);

  const results = await Promise.allSettled(
    processes.map((process) => process.status),
  );

  if (
    results.some((result) =>
      result.status === "rejected" || result.value.success === false
    )
  ) {
    return { success: false, error: null };
  }

  return { success: true };
};

if (import.meta.main) {
  const options = parseArgs(Deno.args, {
    string: ["names"],
    boolean: ["help", "h", "prefix"],
  });

  const commands = options._.map(String);
  const names = options["names"] ? options.names.split(",") : undefined;
  const help = options.help || options.h;
  const prefix = options.prefix;

  if (help || commands.length === 0) {
    console.log("simulta - run multiple commands simultanously");
    console.log(`\nUsage:`);
    console.log(
      "\tdeno run --allow-run --allow-env=SHELL jsr:@koteya/simulta <command1> [command2]",
    );
    console.log("\nOptions:");
    console.log(
      `\t--prefix - prefix each command's output with its index (by default) or names (if --names are used)`,
    );
    console.log(
      "\t--names <name1>,<name2> - list of names to prefix commands with",
    );
    Deno.exit(0);
  }

  const result = await simulta({
    commands,
    names,
    prefix,
    stdout: Deno.stdout.writable,
    stderr: Deno.stderr.writable,
  });

  if (result.success) {
    Deno.exit(0);
  } else {
    if (result.error !== null) {
      console.error(result.error);
    }
    Deno.exit(1);
  }
}
