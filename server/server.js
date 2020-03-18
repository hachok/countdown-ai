import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import shopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import { ApolloServer } from "apollo-server-koa";
import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";
import { Prisma } from "prisma-binding";
import { importSchema } from "graphql-import";
import {
  introspectSchema,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas
} from "graphql-tools";

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

async function run() {
  const server = new Koa();
  const router = new Router();
  server.keys = [SHOPIFY_API_SECRET_KEY];

  server.context.db = db;

  server
    // sets up secure session data on each request
    .use(session({ secure: true, sameSite: "none" }, server))

    // sets up shopify auth
    .use(
      shopifyAuth({
        apiKey: SHOPIFY_API_KEY,
        secret: SHOPIFY_API_SECRET_KEY,
        scopes: ["write_orders, write_products"],
        afterAuth(ctx) {
          const { shop, accessToken } = ctx.session;

          console.log("We did it!", accessToken);

          ctx.redirect("/");
        }
      })
    )

    // application code
    .use(async ctx => {
      const { shop, accessToken } = ctx.session;

      const graphQLServer = new ApolloServer({
        // Make graphql playgroud available at /graphql
        playground: {
          endpoint: "/countdown/graphql"
        },
        schema: await makeMergedSchema(accessToken),
        bodyParser: true,
        context: ({ req }) => ({
          ...req,
          db
        })
      });

      graphQLServer.applyMiddleware({ app: server });
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
}

async function makeMergedSchema(accessToken) {
  const localSchema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      Mutation,
      Query
    }
  });

  console.log("accessToken", accessToken);

  return mergeSchemas({
    schemas: [localSchema]
  });
}

app.prepare().then(() => run());
