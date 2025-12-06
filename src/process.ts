const getShell = (): { shell: string; args: string[] } => {
  const envShell = Deno.env.get("SHELL");

  if (envShell) {
    return { shell: envShell, args: ["-c"] };
  } else {
    return { shell: "sh", args: ["-c"] };
  }
};

export const execCommand = (command: string): Deno.ChildProcess => {
  const { shell, args } = getShell();

  const process = new Deno.Command(shell, {
    args: [...args, command],
    stdout: "piped",
    stderr: "piped",
  });

  return process.spawn();
};

export const createStreamTransformer = (
  transform: (text: string) => string,
) => {
  const textDecoder = new TextDecoder("utf-8");
  const textEncoder = new TextEncoder();

  return new TransformStream({
    start() {},
    async transform(chunkPromise, controller) {
      const chunk = await chunkPromise;

      if (chunk === null) {
        controller.terminate();
      } else {
        const decoded = textDecoder.decode(chunk);
        const encoded = textEncoder.encode(transform(decoded));

        controller.enqueue(encoded);
      }
    },
    flush() {},
  });
};

export const joinStreams = (streams: ReadableStream[]) => {
  return new ReadableStream({
    start(controller) {
      let completed = 0;

      const finish = () => {
        completed++;
        if (completed === streams.length) {
          controller.close();
        }
      };

      for (const stream of streams) {
        stream.getReader().read().then(({ value, done }) => {
          if (done) {
            finish();
          } else {
            controller.enqueue(value);
          }
        });
      }
    },
  });
};
