# Simulta - run multiple commands simultanously

Deno-native way to run multiple shell commands concurrently (in parallel).

## Usage 

CLI

```sh
$ deno run --allow-run --allow-env=SHELL \
    jsr:@koteya/simulta --prefix --names "command,otherCommand" \
    "echo -e Hello\\\nFrom" \
    "echo World"
    
# Outputs:
# [command]      │ Hello
#                │ From
# [otherCommand] │ World
```

Programmatic

```ts
import { simulta } from 'jsr:@koteya/simulta';

await simulta({
  commands: ['echo Hello', 'echo World'],
  prefix: true,
  names: ['command', 'otherCommand'],
  stdout: Deno.stdout.writable,
  stderr: Deno.stderr.writable,
});
```
