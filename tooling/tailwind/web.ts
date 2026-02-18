import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import scrollbar from "tailwind-scrollbar";

export default {
  content: ["./src/**/*.tsx"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans), Plus Jakarta Sans"],
      },
      fontSize: {
        sm: "0.8rem",
      },
      boxShadow: {
        "3xl-dark": "0px 16px 70px rgba(0, 0, 0, 0.5)",
        "3xl-light":
          "rgba(0, 0, 0, 0.12) 0px 4px 30px, rgba(0, 0, 0, 0.04) 0px 3px 17px, rgba(0, 0, 0, 0.04) 0px 2px 8px, rgba(0, 0, 0, 0.04) 0px 1px 1px",
      },
      animation: {
        "border-spin": "border-spin 4s linear infinite",
        "fade-down": "fade-down 0.5s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        scroll: "scroll 40s linear infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "pulse-slow": "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      keyframes: {
        "border-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "fade-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        scroll: {
          "0%": {
            transform: "translateX(0)",
          },
          "100%": {
            transform: "translateX(calc(-50% - 1.5rem))",
          },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "200% 0",
          },
          "100%": {
            backgroundPosition: "-200% 0",
          },
        },
      },
      textColor: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        tertiary: "var(--color-text-tertiary)",
        muted: "var(--color-text-muted)",
      },
      placeholderColor: {
        DEFAULT: "var(--color-text-placeholder)",
      },
      ringColor: {
        border: "var(--color-ring)",
        "border-focus": "var(--color-ring-focus)",
      },
      borderColor: {
        semantic: "var(--color-border)",
        "semantic-focus": "var(--color-border-focus)",
      },
      colors: {
        "icon-default": "var(--color-icon-default)",
        "icon-muted": "var(--color-icon-muted)",
        "brand-50": "rgb(var(--brand-50, 247 247 254) / <alpha-value>)",
        "brand-100": "rgb(var(--brand-100, 239 240 254) / <alpha-value>)",
        "brand-200": "rgb(var(--brand-200, 224 224 252) / <alpha-value>)",
        "brand-300": "rgb(var(--brand-300, 193 194 249) / <alpha-value>)",
        "brand-400": "rgb(var(--brand-400, 146 148 245) / <alpha-value>)",
        "brand-500": "rgb(var(--brand-500, 99 102 241) / <alpha-value>)",
        "brand-600": "rgb(var(--brand-600, 56 60 243) / <alpha-value>)",
        "brand-700": "rgb(var(--brand-700, 14 19 244) / <alpha-value>)",
        "brand-800": "rgb(var(--brand-800, 7 11 211) / <alpha-value>)",
        "brand-900": "rgb(var(--brand-900, 6 9 171) / <alpha-value>)",
        "brand-950": "rgb(var(--brand-950, 4 7 132) / <alpha-value>)",
        "dark-50": "#161616",
        "dark-100": "#1c1c1c",
        "dark-200": "#232323",
        "dark-300": "#282828",
        "dark-400": "#2e2e2e",
        "dark-500": "#343434",
        "dark-600": "#3e3e3e",
        "dark-700": "#505050",
        "dark-800": "#707070",
        "dark-900": "#7e7e7e",
        "dark-950": "#bbb",
        "dark-1000": "#ededed",
        "light-50": "hsl(0deg 0% 98.8%)",
        "light-100": "hsl(0deg 0% 97.3%)",
        "light-200": "hsl(0deg 0% 95.3%)",
        "light-300": "hsl(0deg 0% 92.9%)",
        "light-400": "hsl(0deg 0% 91%)",
        "light-500": "hsl(0deg 0% 88.6%)",
        "light-600": "hsl(0deg 0% 85.9%)",
        "light-700": "hsl(0deg 0% 78%)",
        "light-800": "hsl(0deg 0% 56.1%)",
        "light-900": "hsl(0deg 0% 52.2%)",
        "light-950": "hsl(0deg 0% 43.5%)",
        "light-1000": "hsl(0deg 0% 9%)",
      },
      screens: {
        "2xl": "1600px",
      },
    },
  },
  plugins: [forms, scrollbar],
} satisfies Config;
