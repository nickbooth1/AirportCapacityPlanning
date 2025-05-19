import React from 'react';
import Head from 'next/head';

export default function SimpleApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <title>Airport Capacity Planner</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}