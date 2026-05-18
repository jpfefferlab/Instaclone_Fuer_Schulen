import React from 'react';
import { Link } from 'react-router-dom';
import empty_profile from '../../../assets/images/empty_profile.png';

const SearchUserLink = ({
                          username,
                          first_name,
                          last_name,
                          profile,
                          onClick,
                        }) => {
  return (
    <Link
      component='button'
      onClick={onClick}
      to={`/${username}`}
      className='flex items-center hover:bg-gray-50 py-2 px-4 cursor-pointer'
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
    </Link>
  );
};

export default SearchUserLink;
