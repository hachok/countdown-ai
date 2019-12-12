import { renderPlaygroundPage } from "@apollographql/graphql-playground-html";
import accepts from "accepts";
import { ApolloServer, makeExecutableSchema } from "apollo-server-koa";
import { graphqlKoa } from "apollo-server-koa/dist/koaApollo";

class CustomServer extends ApolloServer {
  applyMiddleware({ app, path }) {
    app.use(path, async (req, res, next) => {
      if (this.playgroundOptions && req.method === "GET") {
        // perform more expensive content-type check only if necessary
        // XXX We could potentially move this logic into the GuiOptions lambda,
        // but I don't think it needs any overriding
        const accept = accepts(req);
        const types = accept.types();
        const prefersHTML =
          types.find(x => x === "text/html" || x === "application/json") ===
          "text/html";

        if (prefersHTML) {
          const playgroundRenderPageOptions = {
            endpoint: path,
            subscriptionEndpoint: this.subscriptionsPath,
            ...this.playgroundOptions
          };
          res.setHeader("Content-Type", "text/html");
          const playground = renderPlaygroundPage(playgroundRenderPageOptions);
          res.write(playground);
          res.end();
          return;
        }
      }

      const {
        // ...omitted for example
      } = req.body;

      const { schema: _remove, context: _context, ...serverObj } = this;

      return graphqlKoa(
        super.createGraphQLServerOptions.bind({
          ...serverObj,
          graphqlPath: path,
          schema: await makeExecutableSchema(),
          // ...omitted for example
          context: {
            // ...omitted for example
            request: req
          }
        })
      )(req, res, next);
    });
  }
}

export default CustomServer;
