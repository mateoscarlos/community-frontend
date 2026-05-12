import { Suspense } from 'react'
import { UploadView } from './UploadView'

// Force fresh server rendering on every request. Without this the page gets
// statically prerendered with a year-long edge cache, so deploys that change
// the phone-upload flow keep serving the old shell to scanned QRs.
export const dynamic = 'force-dynamic'

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadView />
    </Suspense>
  )
}
