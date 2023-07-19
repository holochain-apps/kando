import path from "path";
import { defineConfig } from "vite";
import { svelte } from '@sveltejs/vite-plugin-svelte';

// import checker from "vite-plugin-checker";
// import { viteStaticCopy } from "vite-plugin-static-copy";

const components = [
  "dialog",
  "drawer",
  "dropdown",
  "menu",
  "menu-item",
  "checkbox",
  "divider",
  "menu-label",
  "option",
  "select",
  "tooltip",
  "card",
  "icon-button",
  "button",
  "icon",
  "alert",
  "input",
  "spinner",
  "avatar",
  "skeleton",
];
const exclude = components.map(
  (c) => `@shoelace-style/shoelace/dist/components/${c}/${c}.js`
);
export default defineConfig({
  server: {
    hmr: {
        host: 'localhost',
    },
    watch: {
        usePolling: true
    }
  },
  plugins: [
    svelte(),
    // checker({
    //   typescript: true,
    //   eslint: {
    //     lintCommand: "eslint --ext .ts,.html src",
    //   },
    // }),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: path.resolve(
    //         __dirname,
    //         "../../node_modules/@shoelace-style/shoelace/dist/themes/light.css"
    //       ),
    //       dest: path.resolve(__dirname, "dist"),
    //       rename: "styles.css",
    //     },
    //     {
    //       src: path.resolve(__dirname, "./icon.png"),
    //       dest: path.resolve(__dirname, "dist"),
    //     },
    //   ],
    // }),
  ],
  build: {
    target: "es2021",
    lib: {
      formats: ["es"],
      entry: path.resolve(__dirname, "src/applet.ts"),
      name: "index",
      fileName: () => "index.js",
    },
  },
});
