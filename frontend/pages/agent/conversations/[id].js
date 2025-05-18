import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../../src/components/Layout';
import ConversationDetail from '../../../src/components/agent/ConversationDetail';

export default function ConversationPage() {
  const router = useRouter();
  const { id } = router.query;
  
  return (
    <Layout>
      <Head>
        <title>Conversation | AirportAI Agent</title>
        <meta property="og:title" content="AirportAI Agent Conversation" />
        <meta property="og:description" content="View this conversation with AirportAI Agent" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_BASE_URL}/agent/conversations/${id}`} />
      </Head>
      {id && <ConversationDetail conversationId={id} />}
    </Layout>
  );
} 