import React from 'react';

const SubmitButton = ({ onClick, text }) => {
  return (
    <button
      className='px-4 py-2 rounded-lg flex items-center space-x-2 transition bg-primary-blue text-base text-white'
      onClick={onClick}
    >
      {text}
    </button>
  );
};

export default SubmitButton;
