import chalk from 'chalk';
import yargs from 'yargs';
import { graphiteWithoutRepo } from '../../lib/runner';
import { setApiServer } from '../../lib/utils/api_server';

const args = {
  set: {
    demandOption: false,
    optional: true,
    type: 'string',
    describe: 'Set api server',
  },
  reset: {
    demandOption: false,
    optional: true,
    type: 'boolean',
    describe: 'Reset to original api server',
  },
} as const;

type argsT = yargs.Arguments<yargs.InferredOptionTypes<typeof args>>;

export const command = 'api-server';
export const canonical = 'user api-server';
export const description = 'The api server which Graphite will use.';
export const builder = args;
export const handler = async (argv: argsT): Promise<void> => {
  return graphiteWithoutRepo(argv, canonical, async (context) => {
    if (argv.reset) {
      context.splog.info('Reset api-server');
      setApiServer('', context);
    } else if (argv.set) {
      context.splog.info(
        `Set api-server to "${chalk.green(setApiServer(argv.set, context))}"`
      );
    } else {
      context.splog.info(context.userConfig.getApiServerUrl());
    }
  });
};
