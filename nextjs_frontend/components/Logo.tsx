import React from "react"

export const Logo = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Croissant/Bakery icon */}
      <path
        d="M12 3C7.029 3 3 7.029 3 12C3 16.971 7.029 21 12 21C16.971 21 21 16.971 21 12C21 7.029 16.971 3 12 3Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M12 7C9.239 7 7 9.239 7 12C7 14.761 9.239 17 12 17C14.761 17 17 14.761 17 12C17 9.239 14.761 7 12 7Z"
        fill="currentColor"
      />
      <path
        d="M12 9C10.343 9 9 10.343 9 12C9 13.657 10.343 15 12 15C13.657 15 15 13.657 15 12C15 10.343 13.657 9 12 9Z"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  )
}
