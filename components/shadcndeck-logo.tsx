import type { SVGProps } from "react"

export function ShadcnDeckLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 23.45 23.45" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5.93,11.77c0,2.29,1.41,4.38,3.46,5.27,2.23.97,4.76.47,6.45-1.23l.55.52,3.65,3.66c-3.43,3.45-8.61,4.44-13.09,2.46C2.78,20.6-.04,16.37,0,11.69h5.84s0-11.69,0-11.69h6.03c6.44.01,11.62,5.36,11.59,11.77h-5.92c.02-3.19-2.56-5.82-5.76-5.84v5.84s-5.84,0-5.84,0Z"
        fill="currentColor"
      />
      <path d="M5.6,0h2.18v11.73H0v-6.13C0,2.51,2.51,0,5.6,0Z" fill="currentColor" />
    </svg>
  )
}
