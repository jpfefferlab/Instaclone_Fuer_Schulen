import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { followUser, unfollowUser } from '../../actions/userAction';
import empty_profile from '../../assets/images/empty_profile.png'

const UserListItem = ({ id, profile, username }) => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.user);
  const [follow, setFollow] = useState(
    user.followings.some((following) => following.following_user.id === id),
  );

  const handleFollow = () => {
    setFollow(!follow);
    dispatch(followUser(id));
  };

  const handleUnfollow = () => {
    setFollow(!follow);
    dispatch(unfollowUser(id));
  };

  return (
    <div className='flex justify-between items-center mb-3'>
      <div className='flex space-x-3 items-center'>
        <Link to={`/${username}`}>
          <img
            draggable='false'
            loading='lazy'
            className='w-10 h-10 rounded-full object-cover'
            src={
              profile?.picture
                ? `data:image/jpeg;base64,${profile.picture}`
                : empty_profile
            }
            alt=''
          />
        </Link>
        <div className='flex flex-col'>
          <Link
            to={`/${username}`}
            className='text-black text-sm font-semibold hover:underline'
          >
            {username}
          </Link>
          <span className='text-gray-400 text-sm'>{profile?.first_name}</span>
        </div>
      </div>
      {id !== user.id &&
        (follow ? (
          <button
            onClick={handleUnfollow}
            className='font-medium text-sm bg-red-50 rounded py-1.5 px-5 text-red-600 hover:bg-red-100 hover:text-red-700'
          >
            Unfollow
          </button>
        ) : (
          <button
            onClick={handleFollow}
            className='font-medium bg-primary-blue text-sm text-white hover:shadow rounded px-7 py-1.5'
          >
            Follow
          </button>
        ))}
    </div>
  );
};

export default UserListItem;
