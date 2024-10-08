import shell from 'shelljs';
import quote from 'shell-quote/quote';
import process from 'process';
import { generateOutput } from './index';

const commandLineArgs = process.argv.slice(2);

if (!commandLineArgs[0]) {
  shell.echo(`The graphql-testkit requires an argument to be passed.\nRun graphql-testkit --help for more details`);
} else {
  if (commandLineArgs[0] === '--help') {
    shell.echo(
      '\nendpoint=GraphQL endpoint you want to create the postman collection for\n' +
        'headers=Comma separated list of headers that you want to pass with the request to get the schema\n' +
        'maxDepth=Maximum amount of nesting you want in the auto-generated queries and mutations\n' +
        'outputDirectory=Output directory to store the schema and collection in\n' +
        ''
    );
  } else {
    const config = createConfig(
      {
        maxDepth: 4,
        header: '',
        outputDirectory: `${process.cwd()}/output`
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
    newConfig[key] = quote(Array.isArray(value) ? value : [value]);
  }
  config = { ...config, ...newConfig };
  return config;
}
