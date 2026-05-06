import { render } from "hono/jsx/dom";
import { App } from "./App";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

const domNode = document.getElementById("root");
if (domNode) {
  render(<App />, domNode);
}
