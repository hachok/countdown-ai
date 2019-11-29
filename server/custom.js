export default function shopifyGraphQLProxy() {
  return async function shopifyGraphQLProxyMiddleware(ctx, next) {
    const { session = {} } = ctx;

    console.log("session !!!!!!!");
    console.log("session !!!!!!!", session);
    console.log("session token !!!!!!!", session.token);
  };
}
