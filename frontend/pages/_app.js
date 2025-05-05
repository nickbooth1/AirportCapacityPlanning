import React from 'react';
import Head from 'next/head';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import createEmotionCache from '../lib/createEmotionCache';
import theme from '../lib/theme';
import { AirportConfigProvider } from '../src/contexts/AirportConfigContext';
// For Ant Design v5
import 'antd/dist/reset.css';

// Client-side cache, shared for the whole session of the user in the browser
const clientSideEmotionCache = createEmotionCache();

export default function MyApp(props) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <title>Airport Capacity Planner</title>
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AirportConfigProvider>
          <Component {...pageProps} />
        </AirportConfigProvider>
      </ThemeProvider>
    </CacheProvider>
  );
} 