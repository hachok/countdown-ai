import React, { Component } from "react";
import { Heading, CalloutCard } from "@shopify/polaris";
import { Container } from "./App.styled";

class App extends Component {
  render() {
    return (
      <Heading>
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
        </Container>
      </Heading>
    );
  }
}

export default App;
