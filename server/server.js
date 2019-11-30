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
import * as winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple()
    })
  );
}

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

app.prepare().then(async () => {
  const server = new Koa();
  const router = new Router();
  let _settings = {
    token: "",
    shop: ""
  };
  server.use(session(server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  console.log("starts here");

  server.use(() => {
    console.log("before auth");
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [SCOPES],
      async afterAuth(ctx) {
        //Auth token and shop available in session
        //Redirect to shop upon auth
        const { shop, accessToken } = ctx.session;
        _settings.token = accessToken;
        _settings.shop = shop;
        logger.log({
          level: "info",
          message: "Hello distributed log files!"
        });
        await console.log("before accessToken ----------------- ", accessToken);
        await console.log("before shop ----------------- ", shop);
        await db.mutation.createUser({ data: { name: "1", surname: "1" } });
        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
        ctx.redirect("/");
      }
    });
    console.log("end auth");
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
