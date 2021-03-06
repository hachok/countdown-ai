import React, { useState } from "react";
import { Heading, CalloutCard, Card } from "@shopify/polaris";
import { Container } from "./App.styled";
import { EmptyState, Layout } from "@shopify/polaris";
import { ResourcePicker, TitleBar } from "@shopify/app-bridge-react";
import gql from "graphql-tag";
import { ApolloProvider, Query } from "react-apollo";
import ApolloClient from "apollo-boost";
import fetch from "node-fetch";
import Enter from "./Enter";

const img = "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg";

export const local = new ApolloClient({
  uri: "/countdown",
  fetch
});

const GET_USERS = gql`
  query {
    users {
      id
      name
      surname
    }
  }
`;

const CREATE_USER = gql`
  mutation createUser {
    createUser(data: { name: "Alexey", surname: "Altuhov" }) {
      id
      name
      surname
    }
  }
`;

const SHOPIFY_GET_SHOP = gql`
  query {
    shop {
      id
      name
      email
    }
  }
`;

const App = () => {
  const [open, setOpen] = useState(false);

  const handleSelection = resources => {
    setOpen(false);
  };

  return (
    <Heading>
      <Query query={SHOPIFY_GET_SHOP}>
        {({ data }) => {
          console.log("data", data);
          return (
            <Card>
              <p>stuff here</p>
            </Card>
          );
        }}
      </Query>
      <Container>
        <CalloutCard
          title="Customize the style of your checkout"
          illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
          primaryAction={{
            content: "Customize checkout",
            url: "https://www.shopify.com"
          }}
        >
          <p>Upload your store’s logo, change colors and fonts, and more.</p>
        </CalloutCard>
        <TitleBar
          primaryAction={{
            content: "Select products"
          }}
        />
        <ApolloProvider client={local}>
          <Enter />
        </ApolloProvider>
        <ResourcePicker
          resourceType="Product"
          showVariants={false}
          open={open}
          onSelection={resources => handleSelection(resources)}
          onCancel={() => setOpen(false)}
        />
        <Layout>
          <EmptyState
            heading="Select products to start"
            action={{
              content: "Select products",
              onAction: () => setOpen(false)
            }}
            image={img}
          >
            <p>Select products and change their price temporarily</p>
          </EmptyState>
        </Layout>
      </Container>
    </Heading>
  );
};

export default App;
