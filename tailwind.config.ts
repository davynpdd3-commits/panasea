import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        cream: "#F4EEE1",
        surface: "#FFFCF6",
        "surface-sunken": "#EDE5D4",

        // Coffee brown scale (brand / primary)
        coffee: {
          50: "#F6EFE6",
          100: "#E9DAC4",
          200: "#D3B896",
          300: "#B3946E",
          400: "#8C6B4C",
          500: "#5E4130",
          600: "#4A3222",
          700: "#3A2718",
          800: "#2C1D12",
          900: "#20140C",
        },

        // Text
        ink: "#2C1D12",
        "ink-muted": "#6B5D4F",
        "ink-subtle": "#95897B",

        // Borders
        border: {
          DEFAULT: "#DCD1BC",
          strong: "#C4B69C",
        },

        // Accent (caramel gold — used sparingly for active/highlight states)
        caramel: {
          400: "#CC9A4F",
          500: "#B8863E",
          600: "#96692C",
        },

        // Status
        success: "#5B7A52",
        "success-bg": "#E9EFE3",
        danger: "#A6432D",
        "danger-bg": "#F5E5DF",
        warning: "#C0873A",
        "warning-bg": "#F5EBD8",
        info: "#4E6E80",
        "info-bg": "#E3ECEF",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(44, 29, 18, 0.06), 0 1px 1px rgba(44, 29, 18, 0.04)",
        elevated: "0 4px 12px rgba(44, 29, 18, 0.12)",
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
