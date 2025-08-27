"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 text-sm text-gray-800 bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-md shadow-lg z-50 whitespace-nowrap",
            className
          )}
        >
          {content}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white/90" />
        </div>
      )}
    </div>
  )
}
