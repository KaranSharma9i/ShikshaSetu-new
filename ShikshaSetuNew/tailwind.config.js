/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "margam-orange": "#F97316",
        "margam-navy": "#1E3A8A",
        "neutral-cream": "#FFF7ED",
        "neutral-white": "#FFFFFF",
        "neutral-charcoal": "#1F2937",
        "neutral-steel": "#6B7280",
        "margam-yellow": "#FACC15",
        "gurukul-navy": "#1E40AF",
      },
      fontFamily: {
        poppins: ["Poppins-Regular"],
        "poppins-medium": ["Poppins-Medium"],
        "poppins-semibold": ["Poppins-SemiBold"],
        "poppins-bold": ["Poppins-Bold"],
        inter: ["Inter-Regular"],
        "inter-medium": ["Inter-Medium"],
        "inter-semibold": ["Inter-SemiBold"],
        opensans: ["OpenSans-Regular"],
      },
    },
  },
  plugins: [],
};