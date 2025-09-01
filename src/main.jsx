import React from "react";
import ReactDOM from "react-dom/client";
import EthereumWalletSender from "./EthereumWalletSender";
import './index.css';  // <-- This line imports the CSS

// Create the root React element
const root = ReactDOM.createRoot(document.getElementById("root"));

// Render the App component inside <div id="root"></div>
root.render(
  <React.StrictMode>
    <EthereumWalletSender />
  </React.StrictMode>
);
