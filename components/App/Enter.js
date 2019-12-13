import React, { Component } from "react";
import gql from "graphql-tag";
import { Card } from "@shopify/polaris";
import { Query } from "react-apollo";

const GET_USERS = gql`
  query {
    users {
      id
      name
      surname
    }
  }
`;

export default class Enter extends Component {
  render() {
    return (
      <div>
        <Query query={GET_USERS}>
          {({ data }) => {
            console.log("enter data", data);
            return (
              <Card>
                <p>stuff here</p>
              </Card>
            );
          }}
        </Query>
      </div>
    );
  }
}
