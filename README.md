# GraphQL Testkit

> A utility tool that generates a postman collection with all the mutations and queries that your GraphQL endpoint exposes.

![](logo.svg?raw=true)


## Install

```sh
// with npm
npm install -g graphql-testkit

// with yarn
yarn global add graphql-testkit
```

## Working Demo

![](demo.gif?raw=true)

## Usage

```
graphql-testkit \ 
--endpoint=https://api.spacex.land/graphql\ 
--header="Authorization:123,x-ws-system-id=10" \
--maxDepth=4
```

- ### endpoint (Required)
    The GraphQL endpoint that you want to generate the postman collection for

- ### header (optional)
    Comma separated list of http headers that you need to send to you GraphQL API.

- ### maxDepth (optional)
    The maximum you want to nest the generated queries and mutations. Default value is 4

- ### outputDirectory (optional)
    The directory where the output is saved. Default value is "./output"

## Output
An output directory is created in the `outputDirectory` directory.
A folder structure based on endpoint will be created, which will contain the Postman collection(collections.json)


### For example

endpoint=https://api.spacex.land/graphql

<b>Output Directory</b>
```
${outputDirectory}/api.spacex.land/graphql/collections.json
```

## License

[MIT](LICENSE)
