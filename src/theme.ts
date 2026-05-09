import { createTheme } from '@mui/material/styles';

// Material Design 3 Dark Theme Colors
const md3Dark = {
  background: '#1C1B1F',
  surface: '#1C1B1F',
  surfaceVariant: '#2B2930',
  surface1: '#2B2930',
  surface2: '#2F2E35',
  surface3: '#333238',
  surface4: '#35343B',
  surface5: '#38373E',
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  primaryContainer: '#4F378B',
  onPrimaryContainer: '#EADDFF',
  secondary: '#CCC2DC',
  onSecondary: '#332D41',
  secondaryContainer: '#4A4458',
  onSecondaryContainer: '#E8DEF8',
  onBackground: '#E6E1E5',
  onSurface: '#E6E1E5',
  onSurfaceVariant: '#CAC4D0',
  outline: '#938F99',
  outlineVariant: '#49454F',
  error: '#F2B8B5',
  onError: '#601410',
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: md3Dark.primary,
      light: md3Dark.onPrimaryContainer,
      dark: md3Dark.primaryContainer,
      contrastText: md3Dark.onPrimary,
    },
    secondary: {
      main: md3Dark.secondary,
      light: md3Dark.onSecondaryContainer,
      dark: md3Dark.secondaryContainer,
      contrastText: md3Dark.onSecondary,
    },
    error: {
      main: '#F2B8B5',
      light: '#F9DEDC',
      dark: '#8C1D18',
      contrastText: '#601410',
    },
    background: {
      default: md3Dark.background,
      paper: md3Dark.surface1,
    },
    text: {
      primary: md3Dark.onSurface,
      secondary: md3Dark.onSurfaceVariant,
    },
    divider: md3Dark.outlineVariant,
  },
  typography: {
    fontFamily: [
      'Inter',
      'system-ui',
      '-apple-system',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Manrope, system-ui, sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 500,
    },
    body1: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    body2: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    button: {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    overline: {
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: md3Dark.background,
          color: md3Dark.onSurface,
          scrollbarColor: `${md3Dark.outlineVariant} transparent`,
          '&::-webkit-scrollbar': {
            width: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: md3Dark.outlineVariant,
            borderRadius: 4,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${md3Dark.outlineVariant}`,
          borderRadius: 16,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          fontWeight: 600,
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0 0 20px rgba(208, 188, 255, 0.15)',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: md3Dark.outlineVariant,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: md3Dark.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: md3Dark.primary,
            borderWidth: 2,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: md3Dark.outlineVariant,
          color: md3Dark.onSurfaceVariant,
          '&.Mui-selected': {
            backgroundColor: md3Dark.primaryContainer,
            color: md3Dark.onPrimaryContainer,
            borderColor: md3Dark.primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        filled: {
          backgroundColor: md3Dark.surface2,
          color: md3Dark.onSurface,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: md3Dark.surfaceVariant,
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
