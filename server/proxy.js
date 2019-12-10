import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";
import { importSchema } from "graphql-import";
import { HttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  makeExecutableSchema,
  mergeSchemas
} from "graphql-tools";
import { setContext } from "apollo-link-context";

const typeDefs = importSchema("server/schema.graphql");

export const PROXY_BASE_PATH = "/graphql";
export const GRAPHQL_PATH_PREFIX = "/admin/api";

export default function shopifyGraphQLProxy(proxyOptions, server) {
  return async function shopifyGraphQLProxyMiddleware(ctx, next) {
    const { session = {} } = ctx;

    const shop = "shop" in proxyOptions ? proxyOptions.shop : session.shop;
    const accessToken =
      "password" in proxyOptions ? proxyOptions.password : session.accessToken;
    const version = proxyOptions.version || "2019-07";

    if (ctx.path !== PROXY_BASE_PATH || ctx.method !== "POST") {
      await next();
      return;
    }

    if (accessToken == null || shop == null) {
      ctx.throw(403, "Unauthorized");
      return;
    }

    const gqlSchema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Mutation,
        Query
      }
    });

    console.log("shop", shop);
    console.log(
      "uri",
      `https://${shop}/${GRAPHQL_PATH_PREFIX}/${version}/graphql.json`
    );

    const http = new HttpLink({
      uri: `https://${shop}/${GRAPHQL_PATH_PREFIX}/${version}/graphql.json`,
      fetch
    });

    const link = setContext((request, previousContext) => ({
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      }
    })).concat(http);

    const remoteSchema = await introspectSchema(link);

    const shopifySchema = makeRemoteExecutableSchema({
      schema: remoteSchema,
      link: link
    });

    return mergeSchemas({
      schemas: [gqlSchema, shopifySchema]
    });
  };
}
