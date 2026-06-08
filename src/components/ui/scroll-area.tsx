import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  return (
    // `min-h-0` is critical when ScrollArea is a flex child (e.g.,
    // `flex-1` inside a `flex flex-col` parent like SheetContent).
    // Flex children default to `min-height: auto`, which prevents them
    // from shrinking below their content height. Without this, the
    // ScrollArea expands to fit its content instead of constraining it
    // to the available flex space — and overflow never triggers, so
    // mouse-wheel scrolling does nothing.
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative min-h-0", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      // keepMounted=true keeps the track rendered even when content fits the
      // viewport, so users always see a visible "this area scrolls" rail.
      // Without this, base-ui returns null whenever there's no overflow,
      // which made our long-list panels (Notes, Jump-to-step) feel like
      // they were missing a scrollbar.
      keepMounted
      className={cn(
        // Wider (10px → 12px) + always-visible track. Use border + muted
        // (no opacity) so the rail reads clearly on the popover/sheet
        // background, not as a near-transparent ghost.
        "flex touch-none p-px transition-colors select-none data-horizontal:h-3 data-horizontal:flex-col data-vertical:h-full data-vertical:w-3 bg-muted border border-border",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        // Contrasty default + hover so it reads as a draggable affordance.
        className="relative flex-1 rounded-full bg-muted-foreground/60 hover:bg-muted-foreground transition-colors"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
