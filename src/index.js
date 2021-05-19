import fs from 'fs'
import {capitalize} from 'lodash'

const shell = require('shelljs');

function ucfirst(str) {
    var firstLetter = str.substr(0, 1);
    return firstLetter.toUpperCase() + str.substr(1);
}

const ENDPOINT = "https://anilist.co/graphql"
// shell.exec(`npx cognito-cli createConfig --region=ap-southeast-1 \
//     --userPoolWebClientId=6uobj0e81bfc2hbo1rjked632r\
//     --userPoolId=ap-southeast-1_URpT8rFMN\
//     --email=mac@wednesday.is --password=Wednesday1!`);
// shell.exec(`npx cognito-cli signin > tokens.json`);
//
// const tokenFile = fs.readFileSync(`./tokens.json`, {encoding: 'utf-8'});
//
// const accessToken = JSON.parse(tokenFile).accessToken.jwtToken;
// console.log(accessToken)
//
shell.exec(`rm schema.json`)
shell.exec(`npx get-graphql-schema ${ENDPOINT} -j > schema.json`)
// shell.exec(`npx get-graphql-schema ${ENDPOINT} -h "Authorization=${accessToken}" -j > schema.json`)
const fileData = fs.readFileSync('schema.json', {encoding: 'utf-8'})
const schema = JSON.parse(fileData)['__schema']


const recursivelyHandleOfType = (arg) => {
    if (arg.type.kind === "NON_NULL" ||
        arg.type.kind === "LIST") {
        arg.type = arg.type.ofType
        arg = recursivelyHandleOfType(arg)
    }
    return arg
}

const stackDeepestArg = (arg, arr = []) => {
    arr.push(arg)
    if (arg.type.kind === "NON_NULL" ||
        arg.type.kind === "LIST") {
        const arg1 = Object.assign({}, arg)
        arg1.type = arg1.type.ofType
        arr = stackDeepestArg(arg1, arr)
    }
    return arr
}

function createArgsAndBody(entity, entityObj, result, variables, root, depth, variablesJSON = {}) {
    const originalResult = result;
    const originalVariables = variables;
    if (depth < 1) {
        return [result, variables, variablesJSON]
    }
    if (root) {
        result += `${capitalize(entity.name)}`;
        if (entity.args?.length) {
            result += ` (`
        }
        if (entity.args?.length) {
            result += `) `
        }
    }

    entity.args.forEach((arg, index) => {
        const stackArgs = stackDeepestArg(Object.assign({}, arg)).reverse();
        arg = stackArgs[0]
        let name = arg.type.name;
        stackArgs.forEach(a => {
            const isList = a.type.kind === "LIST"
            const isNonNull = a.type.kind === "NON_NULL"
            name = name || a.type.name
            if (isNonNull) {
                name = `${name}!`
            }
            if (isList) {
                name = `[${name}]`
            }
        });
        // arg = recursivelyHandleOfType(arg)
        variables += `${index ? ', ' : ''}$${entity.name + ucfirst(arg.name)}:${name}`
    })

    if (root) {
        result += '{'
    }
    result += `\n\t${entity.name}`;

    if (entity.args?.length) {
        result += `(`
    }
    entity.args.forEach((arg, index) => {
        variablesJSON[`${entity.name + ucfirst(arg.name)}`] = null
        result += `${index ? ', ' : ''}${arg.name}:$${entity.name + ucfirst(arg.name)}`
    })

    if (entity.args?.length) {
        result += `) `
    }

    result += '{';
    const tempResult = result;
    (entityObj?.fields || []).forEach(field => {
        if (field.isDeprecated) {
            return
        }
        field = recursivelyHandleOfType(field)
        if (field.type.kind !== "SCALAR" && field.type.kind !== "ENUM" && entity.type.kind !== "UNION") {

            const obj = schema.types.find(t => t.name === field.type.name)
            if (obj) {

                [result, variables] = createArgsAndBody(field, obj, result, variables, false, depth - 1, variablesJSON)

            }
        } else {
            result += `\n\t\t${field.name}`
        }

    })
    if (tempResult === result) {
        result = originalResult;
        variables = originalVariables;
    } else {
        result += '\n\t}'
    }

    if (root) {
        result += '\n}'
    }
    return [result, variables,variablesJSON]


}


const endpoint = ENDPOINT.replace(/(http|https):\/\//, '')
shell.exec(`rm -rf output/${endpoint}`);


const queries = schema.types.find(t => t.name === "Query").fields
const mutations = schema.types.find(t => t.name === "Mutation").fields
function generateOutput(list, operationName) {
    list.forEach(e => {
        const entity = recursivelyHandleOfType(e)
        if (entity.type.kind !== "SCALAR" && entity.type.kind !== "ENUM" && entity.type.kind !== "UNION") {
            const entityObj = schema.types.find(t => t.name === entity.type.name)
            shell.exec(`mkdir -p output/${endpoint}/${operationName}/${entity.type.name}`);
            let [result, variables, variablesJSON] = createArgsAndBody(entity, entityObj, "", "", true, 4);
            result = `${operationName} ${result}`
            result = result.replace('()', `(${variables})`)
            fs.writeFileSync(`output/${endpoint}/${operationName}/${entity.type.name}/${entity.type.name}.graphql`, result, {encoding: 'utf-8'})
            fs.writeFileSync(`output/${endpoint}/${operationName}/${entity.type.name}/variables.json`, JSON.stringify(variablesJSON), {encoding: 'utf-8'})
        }
    })
}
generateOutput(queries, "query")
generateOutput(mutations, "mutation")






