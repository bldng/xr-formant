import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true, // Allow external connections for mobile testing
    port: 5173,
  },
  resolve: {
    dedupe: ["three"],
  },
});
