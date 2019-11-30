import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
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
import { setContext } from "apollo-link-context";
const logger = require("pino")();

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev
});
const handle = app.getRequestHandler();
const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES } = process.env;
const typeDefs = importSchema("server/schema.graphql");
const db = new Prisma({
  typeDefs: "prisma/generated/prisma.graphql",
  endpoint:
    "https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage",
  debug: true
});

var debug = require("debug")("http");

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  let _settings = {
    token: "",
    shop: ""
  };

  server.log = new Proxy(
    {},
    {
      get: (target, name) =>
        function() {
          app.emit("log", [name, ctx, ...arguments]);
        }
    }
  );

  server.keys = [SHOPIFY_API_SECRET_KEY];

  console.log("starts here2");

  logger.info("hello world");

  console.log("after auth");

  server.use(async function(ctx, next) {
    console.log(">> two");
    logger.info("async");
  });

  server.use(() => {
    return async function graphqlMiddleware(ctx, next) {
      console.log("ctx ??????????", ctx.session);
      console.log("accessToken ????????", ctx.session.accessToken);
      try {
        const gqlSchema = makeExecutableSchema({
          typeDefs,
          resolvers: {
            Mutation,
            Query
          }
        });

        const http = new HttpLink({
          uri: `https://demo-sample-store1.myshopify.com/admin/api/graphql.json`,
          fetch
        });

        const link = setContext(() => ({
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": ctx.session.accessToken
          }
        })).concat(http);

        const schema = await introspectSchema(http);

        const shopifySchema = makeRemoteExecutableSchema({ schema, link });

        const mergedSchema = mergeSchemas({
          schemas: [gqlSchema, shopifySchema]
        });

        const graphQLServer = new ApolloServer({
          schema: mergedSchema,
          context: ({ req }) => ({
            ...req,
            db
          })
        });
        graphQLServer.applyMiddleware({
          app: server
        });
      } catch (e) {
        console.log("e", e);
      }
      await next();
    };
  });
  console.log("end");
  router.get("*", verifyRequest(), async ctx => {
    await handle(ctx.req, ctx.res);
    ctx.respond = false;
    ctx.res.statusCode = 200;
  });

  server.use(router.allowedMethods());
  server.use(router.routes());

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
