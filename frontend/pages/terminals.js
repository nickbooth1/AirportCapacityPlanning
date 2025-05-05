import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function TerminalsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the Airport Configuration page
    router.replace('/config/airport-configuration');
  }, [router]);
  
  return null; // This page just redirects, so no content to render
} 