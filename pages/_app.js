import ApolloClient from "apollo-boost";
import { ApolloProvider } from "react-apollo";
import App, { Container } from "next/app";
import { AppProvider } from "@shopify/polaris";
import Cookies from "js-cookie";
import "@shopify/polaris/styles.css";
import fetch from "node-fetch";

export const clientCountdown = new ApolloClient({
  uri: "/countdown",
  fetch
});

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    const shopOrigin = Cookies.get("shopOrigin");
    return (
      <Container>
        <AppProvider>
          <ApolloProvider client={clientCountdown}>
            <Component {...pageProps} />
          </ApolloProvider>
        </AppProvider>
      </Container>
    );
  }
}

export default MyApp;
