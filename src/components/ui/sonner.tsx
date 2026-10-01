"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Loader2Icon } from "lucide-react"

// JobDesk toast: a dark ink pill bottom-right with a coloured status dot
// ("Added Ceiling Fan Install. Enter your price."). Stays dark in both themes.
function Dot({ className }: { className: string }) {
  return <span aria-hidden className={`block size-2 rounded-full ${className}`} />
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="bottom-right"
      offset={24}
      mobileOffset={{ bottom: 88 }}
      gap={8}
      icons={{
        success: <Dot className="bg-success-dot" />,
        info: <Dot className="bg-sky-ink" />,
        warning: <Dot className="bg-peach-bar" />,
        error: <Dot className="bg-danger" />,
        loading: <Loader2Icon className="size-3.5 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-auto max-w-[min(420px,calc(100vw-32px))] items-center gap-3 rounded-full bg-toast py-3 pr-5 pl-5 text-[13px] font-semibold text-toast-foreground shadow-float",
          icon: "flex size-2 items-center justify-center",
          title: "leading-snug",
          description: "text-[12px] font-normal text-white/70",
          actionButton:
            "ml-1 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-white/25",
          cancelButton: "text-[12px] text-white/70",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
