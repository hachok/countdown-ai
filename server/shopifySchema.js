import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import { GRAPHQL_PATH_PREFIX } from "./proxy";
import fetch from "node-fetch";
import { print } from "graphql";

const shopifySchema = async ({ query, variables, operationName, ctx }) => {
  console.log("ctx", ctx);
  try {
    const { accessToken } = ctx.session;

    const getSchema = await fetch(`http://api.githunt.com/graphql`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      }
    });

    return getSchema.json();
  } catch (e) {
    console.log("eeeroro", e);
  }
  return { typeDefs };
};

const fetcher = async ({
  query: queryDocument,
  variables,
  operationName,
  context
}) => {
  const query = print(queryDocument);
  console.log("query", query);
  const fetchResult = await fetch("http://api.githunt.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, variables, operationName })
  });
  return fetchResult.json();
};

export default async () => {
  const schema = makeRemoteExecutableSchema({
    schema: await introspectSchema(fetcher),
    fetcher
  });
  return schema;
};
