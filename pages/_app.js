import { ApolloProvider } from "react-apollo";
import App, { Container } from "next/app";
import { AppProvider } from "@shopify/polaris";
import { Provider } from "@shopify/app-bridge-react";
import Cookies from "js-cookie";
import "@shopify/polaris/styles.css";

class MyApp extends App {
  render() {
    const { Component, pageProps, apolloClient } = this.props;
    const shopOrigin = Cookies.get("shopOrigin");
    return (
      <Container>
        <AppProvider>
          <Provider
            config={{
              apiKey: API_KEY,
              shopOrigin: shopOrigin,
              forceRedirect: true
            }}
          >
            <ApolloProvider client={apolloClient}>
              <Component {...pageProps} />
            </ApolloProvider>
          </Provider>
        </AppProvider>
      </Container>
    );
  }
}

export default withApolloClient(MyApp);
