import React from 'react';
import empty_profile from '../../../assets/images/empty_profile.png';

const SearchUserItem = ({
                          username,
                          first_name,
                          last_name,
                          profile,
                          onClick,
                        }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center hover:bg-gray-50 px-4 cursor-pointer ${onClick ? 'w-full py-2' : 'w-5/6 py-4'}`}
    >
      <div className='flex space-x-3 items-center'>
        <img
          className='w-11 h-11 rounded-full object-cover'
          src={
            profile?.picture
              ? `data:image/jpeg;base64,${profile.picture}`
              : empty_profile
          }
          alt='avatar'
        />
        <div className='flex flex-col items-start'>
          <span className='text-black text-sm font-semibold'>{username}</span>
          <span className='text-gray-400 text-sm'>
            {first_name} {last_name}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchUserItem;
