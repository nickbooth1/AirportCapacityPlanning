import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
      contrastText: '#FFDE59',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
    airport: {
      main: '#000000',
      contrastText: '#FFDE59',
    }
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
        containedPrimary: {
          backgroundColor: '#000000',
          color: '#FFDE59',
          '&:hover': {
            backgroundColor: '#333333',
          },
        },
      },
      variants: [
        {
          props: { variant: 'airport' },
          style: {
            backgroundColor: '#000000',
            color: '#FFDE59',
            '&:hover': {
              backgroundColor: '#333333',
            },
          },
        },
      ],
    },
  },
});

export default theme; 