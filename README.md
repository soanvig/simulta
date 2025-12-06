# Simulta - run multiple commands simultanously

Deno-native way to run multiple shell commands concurrently (in parallel).

## Usage 

CLI

```sh
$ deno run --allow-run --allow-env=SHELL \
    jsr:@koteya/simulta --prefix --names "commandA,commandB" \
    "echo Hello" \
    "echo World"
    
# Outputs:
# [commandA] Hello
# [commandB] World
```

Programmatic

```ts
import { simulta } from 'jsr:@koteya/simulta';

await simulta({
  commands: ['echo Hello', 'echo World'],
  prefix: true,
  names: ['commandA', 'commandB'],
  stdout: Deno.stdout.writable,
  stderr: Deno.stderr.writable,
});
```
