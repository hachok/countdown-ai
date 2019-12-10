import React, { Component } from "react";
import { Heading, CalloutCard, Card } from "@shopify/polaris";
import { Container } from "./App.styled";
import { EmptyState, Layout } from "@shopify/polaris";
import { ResourcePicker, TitleBar } from "@shopify/app-bridge-react";
import gql from "graphql-tag";
import { Query, withApollo } from "react-apollo";

const img = "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg";

const GET_USERS = gql`
  query {
    shop {
      id
      name
      email
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

class App extends Component {
  state = { open: false };
  handleSelection = resources => {
    this.setState({ open: false });
    console.log("resources", resources);
  };

  async componentDidMount() {
    const mut = await this.props.client.mutate({
      mutation: CREATE_USER
    });
    console.log("componentDidMount mut", mut);
    const res = await this.props.client.query({
      query: GET_USERS
    });
    console.log("componentDidMount res", res);
  }

  render() {
    return (
      <Heading>
        <Query query={GET_USERS}>
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
          <ResourcePicker
            resourceType="Product"
            showVariants={false}
            open={this.state.open}
            onSelection={resources => this.handleSelection(resources)}
            onCancel={() => this.setState({ open: false })}
          />
          <Layout>
            <EmptyState
              heading="Select products to start"
              action={{
                content: "Select products",
                onAction: () => this.setState({ open: true })
              }}
              image={img}
            >
              <p>Select products and change their price temporarily</p>
            </EmptyState>
          </Layout>
        </Container>
      </Heading>
    );
  }
}

export default withApollo(App);
