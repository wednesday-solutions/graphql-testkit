import fs from 'fs';
import { v4 } from 'uuid';
import { cloneDeep, isEmpty } from 'lodash';
import baseCollection from './base-collection.json';
import sampleFolder from './base-folder.json';
import sampleRequest from './base-request.json';
import prettier from 'prettier';
import Ora from 'ora';
import Promise from 'bluebird';
import shell from 'shelljs';

const INVALID_TYPES = ['SCALAR', 'ENUM', 'UNION'];

function ucfirst(str) {
  const firstLetter = str.substr(0, 1);
  return firstLetter.toUpperCase() + str.substr(1);
}

const recursivelyHandleOfType = (arg) => {
  if (arg.type.kind === 'NON_NULL' || arg.type.kind === 'LIST') {
    arg.type = arg.type.ofType;
    arg = recursivelyHandleOfType(arg);
  }
  return arg;
};

const stackDeepestArg = (arg, arr = []) => {
  arr.push(arg);
  if (arg.type.kind === 'NON_NULL' || arg.type.kind === 'LIST') {
    const arg1 = Object.assign({}, arg);
    arg1.type = arg1.type.ofType;
    arr = stackDeepestArg(arg1, arr);
  }
  return arr;
};

async function createArgsAndBody(
  schema,
  entity,
  entityObj,
  root,
  depth,
  variablesJSON = {},
  result = '',
  variables = ''
) {
  const originalResult = result;
  const originalVariables = variables;
  if (depth < 1) {
    return [result, variables, variablesJSON];
  }
  if (root) {
    // add the name of the operation and variables only for the root iteration.
    // so that we have something like this `query Users()`
    result += `${ucfirst(entity.name)}`;
    if (entity.args?.length) {
      result += `()`;
    }
    result += ` {`;
  }
  result += `\n\t${entity.name}`;

  // if there are arguments we must have an open parenthesis
  if (entity.args?.length) {
    result += `(`;
  }

  // for each argument that an entity has, even a nested entity, we could have a variable.
  entity.args.forEach((arg, index) => {
    // so basically for cases where the argument is NON_NULL/LIST, there is nesting in
    // the arguments and the name will be present only in the deepest arg.
    // so we create a stack of the args, reverse it and start processing from the 0th index
    const stackArgs = stackDeepestArg(Object.assign({}, arg)).reverse();
    arg = stackArgs[0];
    let name = arg.type.name;
    stackArgs.forEach((a) => {
      const isList = a.type.kind === 'LIST';
      const isNonNull = a.type.kind === 'NON_NULL';
      name = name || a.type.name;
      // handle for null and list
      if (isNonNull) {
        name = `${name}!`;
      }
      if (isList) {
        name = `[${name}]`;
      }
    });
    // concatenate all variables in a separate variable so that they can all be added after complete processing.
    if (!{}.hasOwnProperty.call(variablesJSON, `${entity.name + ucfirst(arg.name)}`)) {
      variables += `${index ? ', ' : ''}$${entity.name + ucfirst(arg.name)}:${name}`;
      variablesJSON[`${entity.name + ucfirst(arg.name)}`] = null;
    }

    result += `${index ? ', ' : ''}${arg.name}:$${entity.name + ucfirst(arg.name)}`;
  });

  // if there are arguments we must have a closing parenthesis
  if (entity.args?.length) {
    result += `) `;
  }

  // since its not ENUM/UNION/SCALAR it must have fields
  result += '{';
  const tempResult = result;
  await Promise.mapSeries(entityObj?.fields || [], async (field) => {
    if (field.isDeprecated) {
      return;
    }
    field = recursivelyHandleOfType(field);
    if (!INVALID_TYPES.includes(field.type.kind)) {
      const obj = schema.types.find((t) => t.name === field.type.name);
      if (obj) {
        [result, variables] = await createArgsAndBody(
          schema,
          field,
          obj,
          false,
          depth - 1,
          variablesJSON,
          result,
          variables
        );
      }
    } else {
      result += `\n\t\t${field.name}`;
    }
  });
  // if the tempResult is the same as the result it means that no fields were added
  // so revert to original - this will remove all the arguments and variables
  // that we added since they are no longer needed
  if (tempResult === result) {
    result = originalResult;
    variables = originalVariables;
  } else {
    result += '\n\t}';
  }

  if (root) {
    result += '\n}';
  }
  return [result, variables, variablesJSON];
}

async function generateOperationOutput(schema, list, operationName, config) {
  if (isEmpty(list)) {
    // there are no operations of type ${operationName}
    return;
  }
  // create a new folder for queries/mutations/subscriptions
  const folder = cloneDeep(sampleFolder);
  folder.name = operationName;
  folder.item = [];
  await Promise.mapSeries(list, async (e) => {
    // create a new request for each query/mutation/subscription
    const request = cloneDeep(sampleRequest);
    const entity = recursivelyHandleOfType(e);
    if (!INVALID_TYPES.includes(entity.type.kind)) {
      const entityObj = schema.types.find((t) => t.name === entity.type.name);
      shell.exec(`mkdir -p ${config.outputDirectory}/${config.strippedEndpoint}/${operationName}/${entity.name}`);
      let [result, variables, variablesJSON] = await createArgsAndBody(
        schema,
        entity,
        entityObj,
        true,
        config.maxDepth
      );
      result = `${operationName} ${result}`;
      result = result.replace('()', `(${variables})`);
      result = await prettier.format(result, { parser: 'graphql' });
      const v = prettier.format(JSON.stringify(variablesJSON), {
        parser: 'json-stringify'
      });
      request.request.body.graphql.query = result;

      request.request.header = config.header.split(',').map((header) => {
        const [key, value] = header.split(':');
        return {
          key,
          value,
          type: 'text',
          disabled: false
        };
      });
      request.request.body.graphql.variables = v;
      request.request.url.raw = config.endpoint;
      request.request.url.host = [config.endpoint];
      request.name = `${operationName} ${entity.name}`;
      await new Promise((resolve) => {
        fs.writeFile(
          `${config.outputDirectory}/${config.strippedEndpoint}/${operationName}/${entity.name}/${
            entity.type.name
          }.graphql`,
          result,
          { encoding: 'utf-8' },
          () => {
            resolve();
          }
        );
      });
      await new Promise((resolve) => {
        fs.writeFile(
          `${config.outputDirectory}/${config.strippedEndpoint}/${operationName}/${entity.name}/variables.json`,
          JSON.stringify(variablesJSON),
          { encoding: 'utf-8' },
          () => {
            resolve();
          }
        );
      });
      folder.item.push(request);
    }
  });
  return folder;
}

export const generateOutput = async (config) => {
  config.strippedEndpoint = config.endpoint.replace(/(http|https)\\:\/\//, '').replaceAll('.', '_');

  // create collection
  const collection = {};
  collection.info = baseCollection.info;
  collection.info._postman_id = v4();
  collection.info.name = config.strippedEndpoint;
  collection.item = [];

  let headerCli = '';
  // add headers if any
  if (config.header) {
    config.header.split(',').forEach((h) => {
      const [key, value] = h.split(':');
      headerCli += ` -h ${key}=${value}`;
    });
  }
  // get graphql schema
  const spinner = new Ora(`Fetching schema from ${config.endpoint}`);
  spinner.start();
  await new Promise((resolve) => {
    shell.exec(`npx get-graphql-schema ${config.endpoint} ${headerCli} -j > schema.json`, { async: true }, () => {
      spinner.succeed(`Schema fetched from ${config.endpoint}`);
      resolve();
    });
  });
  // read the schema.json
  const fileData = await new Promise((resolve) =>
    fs.readFile('schema.json', { encoding: 'utf-8' }, (_, fileData) => resolve(fileData))
  );
  // parse the schema
  const schema = JSON.parse(fileData).__schema;

  // delete old output if any
  await new Promise((resolve) =>
    shell.exec(`rm -rf ${config.outputDirectory}/${config.strippedEndpoint}`, { async: true }, () => resolve())
  );

  // get all queries
  const queries = schema.types.find((t) => t.name === 'Query')?.fields;
  // get all mutations
  const mutations = schema.types.find((t) => t.name === 'Mutation')?.fields;

  const createCollection = async () => {
    spinner.stop();
    spinner.text = 'Generating Postman collection';

    spinner.start();
    await new Promise((resolve) => {
      generateOperationOutput(schema, queries, 'query', config)
        .then((o) => {
          collection.item.push(o);
        })
        .then(() => generateOperationOutput(schema, mutations, 'mutation', config))
        .then((o) => {
          collection.item.push(o);
          resolve();
        });
    });
  };
  await createCollection();
  // write the newly created collection to the output folder
  await new Promise((resolve) =>
    fs.writeFile(
      `${config.outputDirectory}/${config.strippedEndpoint}/collections.json`,
      JSON.stringify(collection),
      {
        encoding: 'utf-8'
      },
      () => {
        resolve();
      }
    )
  );
  spinner.succeed('Postman collection generated');
  spinner.succeed(`Output written to: ${config.outputDirectory}/${config.strippedEndpoint}`);
};
