import { expect } from "@std/expect";
import { simulta } from "../src/simulta.ts";
import { Buffer } from "@std/streams";

const textDecoder = new TextDecoder();
const resetEscapeCode = "\x1b[0m";

Deno.test("spawns single command and writes to stdout", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(`foobar${resetEscapeCode}\n`);
  expect(stderrResult).toEqual("");
});

Deno.test("spawns single command and writes to stderr", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['>&2 echo "foobar"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(``);
  expect(stderrResult).toEqual(`foobar${resetEscapeCode}\n`);
});

Deno.test("spawns two commands and writes to stdout", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', 'echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(
    `foobar${resetEscapeCode}\nbarfoo${resetEscapeCode}\n`,
  );
  expect(stderrResult).toEqual(``);
});

Deno.test("spawns two commands and writes one to stdout and second to stderr", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', '>&2 echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(`foobar${resetEscapeCode}\n`);
  expect(stderrResult).toEqual(`barfoo${resetEscapeCode}\n`);
});

Deno.test("reports success false if single command fails", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ["false"],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  expect(result).toEqual({ success: false, error: null });
});

Deno.test("reports success false if one of two commands fails", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ["true", "false"],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  expect(result).toEqual({ success: false, error: null });
});

Deno.test("prefixes stdout and stderr command output using index", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', '>&2 echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
    prefix: true,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(`[0] foobar${resetEscapeCode}\n`);
  expect(stderrResult).toEqual(`[1] barfoo${resetEscapeCode}\n`);
});

Deno.test("prefixes stdout and stderr command output using given names", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', '>&2 echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
    prefix: true,
    names: ["echo1", "echo2"],
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(`[echo1] foobar${resetEscapeCode}\n`);
  expect(stderrResult).toEqual(`[echo2] barfoo${resetEscapeCode}\n`);
});

Deno.test("fails if names.length > commands.length", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', '>&2 echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
    prefix: true,
    names: ["echo1", "echo2", "echo3"],
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({
    success: false,
    error: `--names options provided, but 3 names were given for 2 commands`,
  });
  expect(stdoutResult).toEqual(``);
  expect(stderrResult).toEqual(``);
});

Deno.test("fails if names.length < commands.length", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['echo "foobar"', '>&2 echo "barfoo"'],
    stdout: stdout.writable,
    stderr: stderr.writable,
    prefix: true,
    names: ["echo1"],
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({
    success: false,
    error: `--names options provided, but 1 names were given for 2 commands`,
  });
  expect(stdoutResult).toEqual(``);
  expect(stderrResult).toEqual(``);
});

Deno.test("fails if no commands are given", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: [],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({
    success: false,
    error: "No command provided",
  });
  expect(stdoutResult).toEqual(``);
  expect(stderrResult).toEqual(``);
});

Deno.test("one command quitting early does not stop execution", async () => {
  const stdout = new Buffer();
  const stderr = new Buffer();

  const result = await simulta({
    commands: ['sleep 1 && echo "foobar"', "true"],
    stdout: stdout.writable,
    stderr: stderr.writable,
  });

  const stdoutResult = textDecoder.decode(stdout.bytes());
  const stderrResult = textDecoder.decode(stderr.bytes());

  expect(result).toEqual({ success: true });
  expect(stdoutResult).toEqual(`foobar${resetEscapeCode}\n`);
  expect(stderrResult).toEqual(``);
});
