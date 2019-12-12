import ApolloClient from "apollo-boost";
import App, { Container } from "next/app";
import { AppProvider } from "@shopify/polaris";
import { Provider } from "@shopify/app-bridge-react";
import Cookies from "js-cookie";
import "@shopify/polaris/styles.css";
import { ApolloMultipleClientsProvider } from "@titelmedia/react-apollo-multiple-clients";
import fetch from "node-fetch";

// const shopify = new ApolloClient({
//   fetchOptions: {
//     credentials: "include"
//   }
// });

const local = new ApolloClient({
  uri: "/countdown",
  fetch
});

const clients = {
  firstNamespace: local
};

class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
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
            <ApolloMultipleClientsProvider clients={clients}>
              <Component {...pageProps} />
            </ApolloMultipleClientsProvider>
          </Provider>
        </AppProvider>
      </Container>
    );
  }
}

export default MyApp;
