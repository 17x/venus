import React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  color?: string;
  size?: number;
}

type BasicProps = Partial<React.SVGAttributes<unknown>>

const basicProps: BasicProps = {
  strokeWidth: "2",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
}

const ModifyColor = '#9b9a9a'

export const LayerUp: React.FC<IconProps> = ({size = 24, ...props}) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} stroke="currentColor" viewBox="0 0 24 24"
         fill="none" {...basicProps} {...props}>
      <path fill={ModifyColor} d="M12,10.87l-9.06,5.67,9.06,5.67,9.06-5.67-9.06-5.67Z"/>
      <path fill={'#fff'}
            d="M9.57,7.84c-2.21,1.38-4.42,2.76-6.64,4.15,3.02,1.89,6.04,3.78,9.06,5.67l9.06-5.67c-2.24-1.4-4.48-2.8-6.72-4.2"/>
      <path
        d="M11.96,1.8c.01,2.22.04,6.67.04,6.67M11.96,1.8c-1.87,1.12-3.75,2.25-5.62,3.37M12,1.8c2.09,1.3,3.4,2.13,5.55,3.47"/>
    </svg>
  )
}

export const LayerDown: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
       fill="none" {...basicProps} {...props}>
    <path fill={'#fff'}
          d="M14.43,16.16c2.21-1.38,4.42-2.76,6.64-4.15-3.02-1.89-6.04-3.78-9.06-5.67L2.94,12.02c2.24,1.4,4.48,2.8,6.72,4.2"/>
    <path fill={'#fff'}
          d="M12.04,22.2c0-2.26-.02-4.52-.03-6.77M12.04,22.2c1.87-1.12,3.75-2.25,5.62-3.37M12,22.2c-2.09-1.3-3.4-2.13-5.55-3.47"/>
    <path fill={ModifyColor}
          d="M12,13.13l9.06-5.67L12,1.8,2.94,7.46l9.06,5.67Z"/>

  </svg>
)

export const LayerToTop: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
       fill="none" {...basicProps} {...props}>
    <path d="M12,10.8l-9.65,6.03,9.65,6.03,9.65-6.03-9.65-6.03Z"/>
    <path fill={'#fff'} d="M12,5.99L2.35,12.02l9.65,6.03,9.65-6.03-9.65-6.03Z"/>
    <path fill={ModifyColor} d="M12,1.14L2.35,7.17l9.65,6.03,9.65-6.03L12,1.14Z"/>
  </svg>
)

export const LayerToBottom: React.FC<IconProps> = ({size = 24, ...props}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
       fill="none" {...basicProps} {...props}>
    <path fill={ModifyColor} d="M12,10.8l-9.65,6.03,9.65,6.03,9.65-6.03-9.65-6.03Z"/>
    <path fill={'#fff'} d="M12,5.99L2.35,12.02l9.65,6.03,9.65-6.03-9.65-6.03Z"/>
    <path fill={'#fff'} d="M12,1.14L2.35,7.17l9.65,6.03,9.65-6.03L12,1.14Z"/>
  </svg>
)