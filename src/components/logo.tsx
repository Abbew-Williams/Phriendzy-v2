import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 20"
      width="100"
      height="20"
      {...props}
    >
      <text
        x="0"
        y="15"
        fontFamily="var(--font-space-grotesk), sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill="currentColor"
        className="font-headline"
      >
        Vibeflow
      </text>
    </svg>
  );
}

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
     <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M2 12.072c.072.33.16.653.266.968.21 6.332 6.463 10.158 10.282 10.324.33.015.66.035.99.035.33 0 .66-.02.99-.035 3.82-.166 10.072-3.992 10.282-10.324.107-3.132-1.39-5.11-3.41-6.173C21.75 5.86 17.65 4.3 12 4.3c-5.65 0-9.75 1.56-11.91 2.598-.94.45-1.99 1.4-1.99 2.598 0 .973.58 1.42 1.25 1.637" />
    </svg>
  )
}
