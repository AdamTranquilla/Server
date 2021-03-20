import React from "react";
import WelcomeTable from "./Components/WelcomeTable/WelcomeTable.Component";
import Table from "./Components/Table/Table";
import Menu from "./Components/Menu/Menu";
import Order from "./Components/Order/Order";
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
} from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "http://localhost:8001/graphql",
  }),
  cache: new InMemoryCache(),
});

export default function App() {
  const state = { view: "MENU" };

  return (
    <ApolloProvider client={client}>
      <div className="App">
        <WelcomeTable tableNo={1} />
        {state.view === "TABLE" && (
          <Table mySeat={1} filledSeats={[1, 2, 3]} totalSeats={6} />
        )}
        {state.view === "MENU" && <Menu />}
        <Order />
      </div>
    </ApolloProvider>
  );
}
