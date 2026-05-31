import { createInertiaApp, type ResolvedComponent } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./style.css";

createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob<{ default: ResolvedComponent }>(
      "./pages/**/*.tsx",
    );
    const loader = pages[`./pages/${name}.tsx`];
    if (!loader) throw new Error(`Page not found: ${name}`);
    const page = await loader();
    return page.default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});

registerSW({ immediate: true });
