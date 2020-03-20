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
import {
  introspectSchema,
  makeExecutableSchema,
  makeRemoteExecutableSchema,
  mergeSchemas
} from "graphql-tools";
import { createApolloFetch } from "apollo-fetch";

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
  server.use(session(server));
  server.keys = [SHOPIFY_API_SECRET_KEY];

  server.use(
    createShopifyAuth({
      apiKey: SHOPIFY_API_KEY,
      secret: SHOPIFY_API_SECRET_KEY,
      scopes: [SCOPES],
      async afterAuth(ctx) {
        //Auth token and shop available in session
        //Redirect to shop upon auth
        const { shop } = ctx.session;
        ctx.cookies.set("shopOrigin", shop, { httpOnly: false });
        ctx.redirect("/");
      }
    })
  );

  const graphQLServer = new ApolloServer({
    // Make graphql playgroud available at /graphql
    playground: {
      endpoint: "/countdown/graphql"
    },
    schema: await makeMergedSchema(),
    bodyParser: true,
    context: ({ req }) => ({
      ...req,
      db
    })
  });

  graphQLServer.applyMiddleware({ app: server, path: "/countdown" });

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

async function makeMergedSchema() {
  const fetcher = createApolloFetch({
    uri: `/admin/api/2019-04/graphql.json`
  });

  fetcher.use(({ request, options }, next) => {
    console.log("request.query.session.accessToken", request.query);
    options.headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": ""
    };

    next();
  });

  const shopifySchema = makeRemoteExecutableSchema({
    schema: await introspectSchema(fetcher),
    fetcher
  });

  const localSchema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      Mutation,
      Query
    }
  });

  return mergeSchemas({
    schemas: [localSchema, shopifySchema]
  });
}

app.prepare().then(() => run());
