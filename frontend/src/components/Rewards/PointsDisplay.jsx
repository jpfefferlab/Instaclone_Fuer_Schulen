import React from 'react';
import InfluencePointsIcon from './InfluencePointsIcon';

const PointsDisplay = ({ amount }) => {
  return (
    <div className='flex items-center min-w-fit space-x-1 bg-gradient-to-r from-orange-500 to-pink-500 px-2 py-1 rounded'>
      {/* Points amount */}
      <span className='text-sm font-semibold text-white'>{amount}</span>
      {/* Icon */}
      <InfluencePointsIcon />
    </div>
  );
};

export default PointsDisplay;
