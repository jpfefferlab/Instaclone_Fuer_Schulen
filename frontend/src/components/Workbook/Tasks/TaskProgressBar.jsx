import React from 'react';
import InfluencePointsIcon from '../../Rewards/InfluencePointsIcon';

const TaskProgressBar = ({ currentCount, targetCount }) => {
  const progressPercentage = Math.min((currentCount / targetCount) * 100, 100);

  return (
    <div className='bg-white pt-4 pb-4 pl-6 pr-6 '>
      {/*<h2 className="text-xl font-bold mb-4">Fortschritt</h2>*/}

      {/* Progress bar */}
      <div className='relative items-center mt-1 h-8 w-full rounded-full bg-gray-200 overflow-hidden'>
        <div
          className='absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-200'
          style={{ width: `${progressPercentage}%` }}
        ></div>

        {/* Icon positioning */}
        <div
          className='absolute'
          style={{
            left: `calc(${progressPercentage}% - 30px)`,
          }}
        >
          <InfluencePointsIcon />
        </div>
      </div>
    </div>
  );
};

export default TaskProgressBar;
