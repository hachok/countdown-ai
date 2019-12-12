import { useQuery } from "@apollo/react-hooks";
import gql from "graphql-tag";

const GET_USERS = gql`
  query {
    users {
      id
      name
      surname
    }
  }
`;

export const Enter = () => {
  const users = useQuery(GET_USERS);
  console.log("users", users);
  console.log("users data", users.data);
  return <div>test</div>;
};
