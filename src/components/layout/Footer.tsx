'use client'

export function Footer() {
  return (
    <footer className="border-border mt-auto border-t">
      <div className="text-muted-foreground mx-auto max-w-5xl px-4 py-6 text-center text-sm">
        © {new Date().getFullYear()} Community
      </div>
    </footer>
  )
}
