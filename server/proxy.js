import {
  introspectSchema,
  makeRemoteExecutableSchema,
  makeExecutableSchema,
  mergeSchemas
} from "graphql-tools";
import { HttpLink } from "apollo-link-http";
import { ApolloServer } from "apollo-server-koa";
import { importSchema } from "graphql-import";
import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";
import { Prisma } from "prisma-binding";

export const PROXY_BASE_PATH = "/graphql";
export const GRAPHQL_PATH_PREFIX = "/admin/api";
const typeDefs = importSchema("server/schema.graphql");

const db = new Prisma({
  typeDefs: "prisma/generated/prisma.graphql",
  endpoint:
    "https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage",
  debug: true
});

export default function graphQLProxy(proxyOptions, server) {
  return async function graphQLProxyMiddleware(ctx, next) {
    const { session = {} } = ctx;

    const shop = "shop" in proxyOptions ? proxyOptions.shop : session.shop;
    const accessToken =
      "password" in proxyOptions ? proxyOptions.password : session.accessToken;
    const version = proxyOptions.version || "2019-07";

    try {
      console.log("test");
      const gqlSchema = makeExecutableSchema({
        typeDefs,
        resolvers: {
          Mutation,
          Query
        }
      });

      const mergedSchema = mergeSchemas({
        schemas: [gqlSchema]
      });

      const graphQLServer = new ApolloServer({
        schema: mergedSchema,
        // Make graphql playgroud available at /graphql
        playground: {
          endpoint: "/countdown/playground"
        },
        path: "/countdown",
        bodyParser: true,
        context: ({ req }) => ({
          ...req,
          db
        })
      });

      graphQLServer.applyMiddleware({
        app: server,
        path: "/countdown"
      });
    } catch (e) {
      console.log("e", e);
    }
  };
}
