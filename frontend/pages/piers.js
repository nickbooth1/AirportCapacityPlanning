import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function PiersPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the Airport Configuration page (tab 2 for piers)
    router.replace('/config/airport-configuration');
  }, [router]);
  
  return null; // This page just redirects, so no content to render
} 