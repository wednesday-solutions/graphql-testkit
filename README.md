<img align="left" src="https://github.com/wednesday-solutions/graphql-testkit/blob/develop/assets/logo.svg" width="480" height="440" />

<div>
  <a href="https://www.wednesday.is?utm_source=gthb&utm_medium=repo&utm_campaign=serverless" align="left" style="margin-left: 0;">
    <img src="https://uploads-ssl.webflow.com/5ee36ce1473112550f1e1739/5f5879492fafecdb3e5b0e75_wednesday_logo.svg">
  </a>
  <p>
    <h1 align="left">GraphQL Testkit
    </h1>
  </p>

  <p>
A utility tool that generates a postman collection with all the mutations and queries that your GraphQL endpoint exposes.
  </p>

  ___


  <p>
    <h4>
      Expert teams of digital product strategists, developers, and designers.
    </h4>
  </p>

  <div>
    <a href="https://www.wednesday.is/contact-us?utm_source=gthb&utm_medium=repo&utm_campaign=serverless" target="_blank">
      <img src="https://uploads-ssl.webflow.com/5ee36ce1473112550f1e1739/5f6ae88b9005f9ed382fb2a5_button_get_in_touch.svg" width="121" height="34">
    </a>
    <a href="https://github.com/wednesday-solutions/" target="_blank">
      <img src="https://uploads-ssl.webflow.com/5ee36ce1473112550f1e1739/5f6ae88bb1958c3253756c39_button_follow_on_github.svg" width="168" height="34">
    </a>
  </div>

  ___

<span>We’re always looking for people who value their work, so come and join us. <a href="https://www.wednesday.is/hiring">We are hiring!</a></span>
</div>

  ___

<br />


## Install

```sh
// with npm
npm install -g graphql-testkit

// with yarn
yarn global add graphql-testkit
```

## Working Demo

![Demo](./assets/demo.gif)

## Usage

```
graphql-testkit \ 
--endpoint=https://api/spacex.land/graphql\ 
--header="Authorization:123,x-ws-system-id=10" \
--maxDepth=4
```

- ### endpoint (Required)
    The GraphQL endpoint that you want to generate the postman collection for

- ### header (optional)
    Comma separated list of http headers that you need to send to you GraphQL API.

- ### maxDepth (optional)
    The maximum you want to nest the generated queries and mutations. Default value is 4

## Output
An output directory is created in the current working directory.  
A folder structure based on endpoint will be created, which will contain the Postman collection(collections.json)


### For example

endpoint=https://api.spacex.land/graphql

<b>Output Directory</b>
```
output/api.spacex.land/graphql/collections.json
```

## License

[MIT](LICENSE)