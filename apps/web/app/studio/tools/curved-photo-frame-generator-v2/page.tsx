'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CurvedPhotoFrameGeneratorV2RedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/studio/tools/curved-photo-frame-v2');
  }, [router]);

  return null;
}
