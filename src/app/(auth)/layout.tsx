/** Centered layout for sign in and password change. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink text-[14px] font-bold text-ink-foreground">
            JD
          </span>
          <span className="text-[20px] font-bold tracking-tight text-text">JobDesk</span>
        </div>
        {children}
      </div>
    </main>
  )
}
