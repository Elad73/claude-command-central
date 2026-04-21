import { Command } from 'commander';
import { registerWatch } from './cli/watch.js';
import { registerEmit } from './cli/emit.js';
import { registerDemo } from './cli/demo.js';
import { registerInit } from './cli/init.js';
import { registerServe } from './cli/serve.js';

const program = new Command();

program
  .name('ccc')
  .description('Terminal-native mission control for agentic workflows.')
  .version('0.1.0');

registerWatch(program);
registerEmit(program);
registerDemo(program);
registerInit(program);
registerServe(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
