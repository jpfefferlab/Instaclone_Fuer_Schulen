import React from 'react';

const Auth = ({ children }) => {
  return (<div className='w-full h-full flex justify-center'>
    <div className='w-full md:w-2/3 py-8'>
      <div className='flex flex-col gap-3 mx-auto md:w-2/5'>{children}</div>
    </div>
  </div>);
};

export default Auth;
