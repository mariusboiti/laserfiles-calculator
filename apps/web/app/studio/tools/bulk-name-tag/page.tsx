'use client';

 import { useEffect } from 'react';
 import { useRouter } from 'next/navigation';

export default function BulkNameTagPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/studio/tools/bulk-name-tags');
  }, [router]);

  return (
    <div />
  );
}
