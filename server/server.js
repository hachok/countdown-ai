import "@babel/polyfill";
import dotenv from "dotenv";
import "isomorphic-fetch";
import createShopifyAuth, { verifyRequest } from "@shopify/koa-shopify-auth";
import graphQLProxy, { ApiVersion } from "@shopify/koa-shopify-graphql-proxy";
import Koa from "koa";
import next from "next";
import Router from "koa-router";
import session from "koa-session";
import { ApolloServer, gql } from "apollo-server-koa";
import { Mutations } from "./gql/resolvers/mutation";
import { Queries } from "./gql/resolvers/query";
import { Prisma } from "prisma-binding";
import {importSchema} from 'graphql-import';

dotenv.config();
const port = parseInt(process.env.PORT, 10) || 8081;
const dev = process.env.NODE_ENV !== "production";
const app = next({
  dev
});
const handle = app.getRequestHandler();
const { SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES } = process.env;
const typeDefs = importSchema('/gql/schema.graphql');

const db = new Prisma({
  typeDefs: "./generated/prisma.graphql",
  endpoint: "https://countdown-43264fa942.herokuapp.com/countdown-service/countdown-stage"
});

const graphQLServer = new ApolloServer({
  typeDefs,
  resolvers: {
    Mutations,
    Queries
  },
  // Make graphql playgroud available at /graphql
  playground: {
    endpoint: "/graphql"
  },
  bodyParser: true,
  context: ({ req }) => ({
    ...req,
    db
  })
});

app.prepare().then(() => {
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

  graphQLServer.applyMiddleware({
    app: server
  });

  server.use(graphQLProxy({ version: ApiVersion.July19 }));

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
