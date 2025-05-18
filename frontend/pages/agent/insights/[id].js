import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../src/components/Layout';
import InsightDetail from '../../../src/components/agent/InsightDetail';

export default function InsightPage() {
  const router = useRouter();
  const { id } = router.query;
  
  return (
    <Layout>
      <Head>
        <title>Insight | AirportAI Agent</title>
        <meta property="og:title" content="AirportAI Agent Insight" />
        <meta property="og:description" content="View this insight from AirportAI Agent" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/agent/insights/${id}`} />
      </Head>
      {id && <InsightDetail insightId={id} />}
    </Layout>
  );
} 