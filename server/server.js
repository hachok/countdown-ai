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
export const GRAPHQL_PATH_PREFIX = "/admin/api";

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
        await db.mutation.createUser({
          data: { name: shop, surname: accessToken }
        });

        try {
          const gqlSchema = makeExecutableSchema({
            typeDefs,
            resolvers: {
              Mutation,
              Query
            }
          });

          const http = new HttpLink({
            uri: `${GRAPHQL_PATH_PREFIX}/2019-07/graphql.json`,
            fetch
          });

          const link = setContext(() => ({
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken
            }
          })).concat(http);

          const schema = await introspectSchema(http);

          const shopifySchema = makeRemoteExecutableSchema({ schema, link });

          const mergedSchema = mergeSchemas({
            schemas: [gqlSchema, shopifySchema]
          });

          const graphQLServer = new ApolloServer({
            schema: shopifySchema
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
