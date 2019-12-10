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
import { createHttpLink, HttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import {
  introspectSchema,
  makeRemoteExecutableSchema,
  makeExecutableSchema,
  mergeSchemas,
  FilterTypes
} from "graphql-tools";
import { setContext } from "apollo-link-context";
import transformSchema from "graphql-tools/dist/transforms/transformSchema";
import proxy from "koa-better-http-proxy";

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
export const PROXY_BASE_PATH = "/graphql";
export const GRAPHQL_PATH_PREFIX = "admin/api";
export const version = "2019-07";

async function noop() {}

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  server.use(session(server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  console.log("starts here");

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [SCOPES],
      async afterAuth(ctx) {
        //Auth token and shop available in session
        //Redirect to shop upon auth
        const { shop, accessToken } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
        try {
          if (ctx.path !== PROXY_BASE_PATH || ctx.method !== "POST") {
            await next();
            return;
          }

          await proxy(shop, {
            https: true,
            parseReqBody: false,
            // Setting request header here, not response. That's why we don't use ctx.set()
            // proxy middleware will grab this request header
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken
            },
            proxyReqPathResolver() {
              return `${GRAPHQL_PATH_PREFIX}/${version}/graphql.json`;
            }
          })(
            ctx,

            /*
              We want this middleware to terminate, not fall through to the next in the chain,
              but sadly it doesn't support not passing a `next` function. To get around this we
              just pass our own dummy `next` that resolves immediately.
            */
            noop
          );

          const gqlSchema = makeExecutableSchema({
            typeDefs,
            resolvers: {
              Mutation,
              Query
            }
          });

          const http = new HttpLink({
            uri: `https://demo-sample-store1.myshopify.com/admin/api/graphql.json`,
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
        } catch (e) {
          console.log("e", e);
        }
        ctx.redirect("/");
      }
    })
  );

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
