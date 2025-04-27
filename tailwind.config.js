// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Add your custom fonts here
        // Example: 'sans' replaces the default sans-serif font
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // You can also add additional custom font families
        custom: ["Poppins", "sans-serif"],
        heading: ["Montserrat", "sans-serif"],
      },
      colors: {
        // Add your custom color
        "bs-gray-800": "var(--bs-gray-800)",
      },
    },
  },
  plugins: [],
};
