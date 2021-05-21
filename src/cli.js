import shell from 'shelljs';
import process from 'process';
import { generateOutput } from './index';

const commandLineArgs = process.argv.slice(2);

if (!commandLineArgs[0]) {
  shell.exec(
    `echo Sorry! graphql-testkit requires an argument to be passed. Run graphql-testkit --help for more details`
  );
} else {
  if (commandLineArgs[0] === '--help') {
    shell.echo(
      'endpoint=GraphQL endpoint you want to create the postman collection for\n' +
        'headers=Comma separated list of headers that you want to pass with the request to get the schema\n' +
        'maxDepth=Maximum amount of nesting you want in the auto-generated queries and mutations\n' +
        ''
    );
  } else {
    const config = createConfig(
      {
        maxDepth: 4
      },
      commandLineArgs
    );
    if (!config.endpoint) {
      shell.echo(
        `Sorry! graphql-testkit requires an endpoint to be passed. Run graphql-testkit --help for more details`
      );
    } else {
      generateOutput(config);
    }
  }
}

export function createConfig(config, args) {
  const newConfig = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const [k, value] = arg.toString().split('=');
    const key = k.replace('--', '');
    if (!k.includes('--')) {
      return shell.echo(`Invalid arg ${key}`);
    }
    newConfig[key] = value;
  }
  config = { ...config, ...newConfig };
  return config;
}
