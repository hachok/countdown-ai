import fetch from "node-fetch";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools";
import { GRAPHQL_PATH_PREFIX } from "./proxy";
import { importSchema } from "graphql-import";
const typeDefs = importSchema("server/schema.graphql");

const shopifySchema = async ({ query, variables, operationName, ctx }) => {
  console.log("ctx", ctx);
  try {
    const { accessToken } = ctx.session;

    const getSchema = await fetch(
      `https://${GRAPHQL_PATH_PREFIX}/2019-04/graphql.json`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken
        }
      }
    );
    return getSchema.json();
  } catch (e) {
    console.log("eeeroro", e);
  }
  return { typeDefs };
};

export default async () => {
  return makeRemoteExecutableSchema({
    schema: await introspectSchema(shopifySchema),
    fetcher: shopifySchema
  });
};
