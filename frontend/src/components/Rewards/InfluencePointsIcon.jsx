import React from 'react';
import SvgIcon from '@mui/material/SvgIcon';

const InfluencePointsIcon = () => (
  <SvgIcon>
    <svg
      viewBox='0 0 100 100'
      width='24'
      height='24'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        {/* Inner Circle Gradient */}
        <linearGradient id='inner-gradient' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#F58529' />
          <stop offset='50%' stopColor='#DD2A7B' />
          <stop offset='100%' stopColor='#8134AF' />
        </linearGradient>
        {/* Outer Rim Gradient */}
        <linearGradient id='outer-gradient' x1='1' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor='#FAD961' />
          <stop offset='100%' stopColor='#F76B1C' />
        </linearGradient>
      </defs>

      {/* Outer Circle for Coin Rim with Darker Stroke */}
      <circle
        cx='50'
        cy='50'
        r='45'
        fill='url(#outer-gradient)'
        stroke='#E56B23'
        strokeWidth='2'
      />

      {/* Inner Circle for Coin Face */}
      <circle cx='50' cy='50' r='38' fill='url(#inner-gradient)' />

      {/* Text at the center */}
      <text
        x='50'
        y='50'
        fontSize='50'
        fontWeight='bold'
        textAnchor='middle'
        fill='none'
        stroke='white'
        strokeWidth='3'
        fontFamily='Arial'
        dy='.35em'
      >
        IP
      </text>
    </svg>
  </SvgIcon>
);

export default InfluencePointsIcon;
