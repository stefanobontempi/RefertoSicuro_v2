/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Medical pastell color system
        medical: {
          // Primary blues - based on #5399d9
          50: '#f5f8fa',
          100: '#e8eff4',
          200: '#d1dee7',
          300: '#a7c1d1',
          400: '#759bb6',
          500: '#5399d9',
          600: '#5399d9', // Main brand color #5399d9
          700: '#162f44',
          800: '#122738',
          900: '#0e1f2c',
        },

        // Soft greens - healing and nature
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // Warm corals - gentle alerts
        warning: {
          50: '#fef7f0',
          100: '#feecdc',
          200: '#fcd9bd',
          300: '#fdba8c',
          400: '#ff8a4c',
          500: '#ff5a1f',
          600: '#d03801',
          700: '#b02e00',
          800: '#9c2a00',
          900: '#771c00',
        },

        // Soft roses - errors but gentle
        error: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
        },

        // Lavender accents - calming highlights
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },

        // Warm grays - professional but soft
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        }
      },

      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'display': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 0 50px rgba(83, 153, 217, 0.3), 0 0 25px rgba(83, 153, 217, 0.2)',
      },

      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float-slow': 'floatSlow 35s infinite ease-in-out',
        'float-medium': 'floatMedium 47s infinite ease-in-out',
        'float-fast': 'floatFast 52s infinite ease-in-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatSlow: {
          '0%': { transform: 'translate(0vw, 0vh) scale(1)' },
          '25%': { transform: 'translate(60vw, 20vh) scale(1.1)' },
          '50%': { transform: 'translate(20vw, 70vh) scale(0.9)' },
          '75%': { transform: 'translate(-20vw, 40vh) scale(1.05)' },
          '100%': { transform: 'translate(0vw, 0vh) scale(1)' },
        },
        floatMedium: {
          '0%': { transform: 'translate(0vw, 0vh) scale(1)' },
          '25%': { transform: 'translate(-40vw, 60vh) scale(0.95)' },
          '50%': { transform: 'translate(70vw, 10vh) scale(1.08)' },
          '75%': { transform: 'translate(30vw, -30vh) scale(0.92)' },
          '100%': { transform: 'translate(0vw, 0vh) scale(1)' },
        },
        floatFast: {
          '0%': { transform: 'translate(0vw, 0vh) scale(1)' },
          '25%': { transform: 'translate(-60vw, -20vh) scale(1.12)' },
          '50%': { transform: 'translate(40vw, 80vh) scale(0.88)' },
          '75%': { transform: 'translate(80vw, 30vh) scale(1.06)' },
          '100%': { transform: 'translate(0vw, 0vh) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}