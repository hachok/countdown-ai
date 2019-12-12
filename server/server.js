import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import { ApolloServer, makeExecutableSchema } from "apollo-server-koa";
import { HttpLink } from "apollo-link-http";
import {
  makeRemoteExecutableSchema,
  mergeSchemas,
  introspectSchema
} from "graphql-tools";
import fetch from "node-fetch";
import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";
import { Prisma } from "prisma-binding";
import { importSchema } from "graphql-import";

dotenv.config();

const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev
});

const handle = app.getRequestHandler();

const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES } = process.env;

export const BASE_PATH = "/countdown";
export const GRAPHQL_PATH_PREFIX = "admin/api";

const typeDefs = importSchema("server/schema.graphql");

const db = new Prisma({
  typeDefs: "prisma/generated/prisma.graphql",
  endpoint:
    "https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage",
  debug: true
});

app.prepare().then(async ctx => await run());

const createRemoteSchema = async (uri, settings) => {
  const config = { uri: uri, fetch, ...settings };
  try {
    const link = new HttpLink(config);
    // Introspection is what gives us
    //the self documenting magic of GraphQL
    const schema = await introspectSchema(link);

    return makeRemoteExecutableSchema({
      schema,
      link
    });
  } catch (error) {
    console.log(error);
  }
};

// Server Function
async function run() {
  /* First we need to fetch our remote APIs,
	inspect their content and then apply the use
	Apollo to merge their schemas. */

  const server = new Koa();
  const router = new Router();
  server.use(session(server));

  const oAuthStartPath = `${prefix}/auth`;
  const oAuthCallbackPath = `${oAuthStartPath}/callback`;

  const oAuthStart = createOAuthStart(config, oAuthCallbackPath);
  const oAuthCallback = createOAuthCallback(config);

  // const SHOPIFY_API_URL = `https://${shop}/${GRAPHQL_PATH_PREFIX}/${ApiVersion.July19}/graphql.json`;

  const gqlSchema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      Mutation,
      Query
    }
  });

  // const remoteShopifySchema = await createRemoteSchema(SHOPIFY_API_URL, {
  //   headers: {
  //     "Content-Type": "application/json",
  //     "X-Shopify-Access-Token": accessToken
  //   }
  // });

  const mergedSchema = mergeSchemas({
    schemas: [gqlSchema]
  });

  console.log("ctx", ctx);

  const graphQLServer = new ApolloServer({
    schema: mergedSchema,
    // Make graphql playgroud available at /graphql
    playground: {
      endpoint: `${BASE_PATH}/playground`
    },
    context: ({ req }) => ({
      ...req,
      db
    })
  });

  graphQLServer.applyMiddleware({
    app: server,
    path: BASE_PATH
  });

  server.use(async ctx => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}
