"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          // Use surface-high-bg-default so the toast contrasts against the
          // page background (which the WS shim maps to --app-bg, the same
          // color as --popover by default — would make toasts disappear).
          // Falls back to --popover if the var isn't defined.
          "--normal-bg": "var(--surface-high-bg-default, var(--popover))",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--outline, var(--border))",
          "--border-radius": "var(--radius)",
          boxShadow: "0 8px 24px -8px rgba(0, 0, 0, 0.18), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
