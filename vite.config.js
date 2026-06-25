import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "./",
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/three/examples/jsm/libs/draco/*",
          dest: "",
          // rename: { stripBase: true },
        },
      ],
    }),
  ],
});
