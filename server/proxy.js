import { ApolloServer } from "apollo-server-koa";
import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";
import { Prisma } from "prisma-binding";
import { importSchema } from "graphql-import";
import { HttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  makeExecutableSchema,
  mergeSchemas
} from "graphql-tools";

const typeDefs = importSchema("server/schema.graphql");
const db = new Prisma({
  typeDefs: "prisma/generated/prisma.graphql",
  endpoint:
    "https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage",
  debug: true
});

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

    const http = new HttpLink({
      uri: `https://${shop}/${GRAPHQL_PATH_PREFIX}/${version}/graphql.json`,
      fetch,
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      }
    });

    const remoteSchema = await introspectSchema(http);

    const shopifySchema = makeRemoteExecutableSchema({
      schema: remoteSchema,
      link: http
    });

    const mergedSchema = mergeSchemas({
      schemas: [gqlSchema, shopifySchema]
    });

    const graphQLServer = new ApolloServer({
      schema: mergedSchema
    });
    graphQLServer.applyMiddleware({
      app: server
    });
  };
}
