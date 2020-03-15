import registerServices from "@workpop/graphql-proxy";
export const PROXY_BASE_PATH = "/graphql";
export const GRAPHQL_PATH_PREFIX = "/admin/api";
export default function shopifyGraphQLProxy(proxyOptions, server) {
  return async function shopifyGraphQLProxyMiddleware(ctx, next) {
    const { session = {} } = ctx;

    const shop = "shop" in proxyOptions ? proxyOptions.shop : session.shop;
    const accessToken =
      "password" in proxyOptions ? proxyOptions.password : session.accessToken;
    const version = proxyOptions.version;

    if (ctx.path !== PROXY_BASE_PATH || ctx.method !== "POST") {
      await next();
      return;
    }

    if (accessToken == null || shop == null) {
      ctx.throw(403, "Unauthorized");
      return;
    }

    const SERVICE_CONFIG = {
      service1: {
        address: `${GRAPHQL_PATH_PREFIX}/${version}/graphql.json`
      },
      service2: {
        address: "https://countdown-43264fa942.herokuapp.com/countdown"
      }
    };

    await registerServices({
      server,
      SERVICE_CONFIG,
      customHeaders: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      }
    });
  };
}
