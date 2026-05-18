import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { clearErrors, followUser, getUserDetails, unfollowUser } from '../../actions/userAction';
import { toast } from 'react-toastify';
import BackdropLoader from '../Layouts/BackdropLoader';
import { FOLLOW_USER_RESET } from '../../constants/userConstants';
import UsersDialog from '../Layouts/UsersDialog';
import MetaData from '../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import PostContainer from '../Posts/PostContainer';
import NotFound from '../Errors/NotFound';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import empty_profile from '../../assets/images/empty_profile.png';

const Profile = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const params = useParams();

  const [follow, setFollow] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [followersModal, setFollowersModal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [selectedTab, setSelectedTab] = useState('posts');

  const { user, error, loading } = useSelector((state) => state.userDetails);

  const { user: loggedInUser } = useSelector((state) => state.user);
  const {
    error: followError, success, message,
  } = useSelector((state) => state.followUser);
  const handleFollow = () => {
    setFollow(!follow);
    dispatch(followUser(user.id));
  };

  const handleUnfollow = () => {
    setFollow(!follow);
    dispatch(unfollowUser(user.id));
  };

  const handleFollowersModal = () => {
    setFollowersModal(true);
    setViewModal(true);
  };

  const handleFollowingModal = () => {
    setViewModal(true);
    setFollowersModal(false);
  };

  const closeModal = () => {
    setViewModal(false);
  };

  const handleTabClick = (tab) => {
    setSelectedTab(tab);
  };


  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }

    if (followError) {
      toast.error(followError);
      dispatch(clearErrors());
    }
    if (success) {
      toast.success(message);
      dispatch({ type: FOLLOW_USER_RESET });
    }
  }, [error, followError, success, message]);

  useEffect(() => {
    const fetchData = async () => {
      setViewModal(false);
      setLoadingUser(false);
      await dispatch(getUserDetails(params.username));
      setLoadingUser(true);
    };
    fetchData();
  }, [dispatch, params.username]);

  useEffect(() => {
    setFollow(user?.followers?.some((u) => u.user.id === loggedInUser.id));
  }, [user]);

  if (!loadingUser) {
    return <BackdropLoader />;
  }

  return (<>
    <MetaData
      title={`${user?.username} (@${user?.username}) • Instaclone photos and videos`}
    />

    {loading && <BackdropLoader />}
    {user ? (<div className='xl:w-2/3 mx-auto'>
      <div className='sm:flex w-full sm:py-8'>
        {/* profile picture */}
        <div className='sm:w-1/3 flex justify-center mx-auto sm:mx-0'>
          <img
            draggable='false'
            className='w-40 h-40 rounded-full object-cover'
            src={user.profile?.picture ? `data:image/jpeg;base64,${user.profile.picture}` : empty_profile}
            alt=''
          />
        </div>

        {/* profile details */}
        <div className='flex flex-col gap-6 p-4 sm:w-2/3 sm:p-1'>
          <div className='flex items-center gap-8 sm:justify-start justify-between'>
            <h2 className='text-2xl sm:text-3xl font-thin'>
              {user.username}
            </h2>
            {loggedInUser.username === user.username ? (<div className='flex gap-3 items-center'>
              <Link
                to='/accounts/edit'
                className='border font-medium hover:bg-gray-50 text-sm rounded px-2 py-1'
              >
                {t('edit_profile')}
              </Link>
              <Link to='/accounts/edit'> <SettingsOutlinedIcon fontSize='medium' /></Link>
            </div>) : (<div className='flex gap-3 items-center'>
              {follow ? (<>
                <button
                  onClick={handleUnfollow}
                  className='font-medium text-sm bg-red-50 rounded py-1.5 px-3 text-red-600 hover:bg-red-100 hover:text-red-700'
                >
                  {t('unfollow')}
                </button>
              </>) : (<button
                onClick={handleFollow}
                className='font-medium bg-primary-blue text-sm text-white hover:shadow rounded px-6 py-1.5'
              >
                {t('follow')}
              </button>)}
            </div>)}
          </div>

          <div className='flex justify-between items-center max-w-[21.5rem]'>
            <div>
              <span className='font-semibold'>{user.post_count}</span>{' '}
              {t('posts')}
            </div>
            <div onClick={handleFollowersModal} className='cursor-pointer'>
              <span className='font-semibold'>{user.follower_count}</span>{' '}
              {t('followers')}
            </div>
            <div onClick={handleFollowingModal} className='cursor-pointer'>
              <span className='font-semibold'>{user.following_count}</span>{' '}
              {t('following')}
            </div>
          </div>

          {/* bio */}
          <div className='max-w-full'>
            <p className='font-medium'>
              {user.first_name} {user.last_name}
            </p>
            <p className='whitespace-pre-line'>{user.profile?.bio}</p>
          </div>
        </div>
      </div>

      {followersModal ? (<UsersDialog
        title='Followers'
        open={viewModal}
        onClose={closeModal}
        usersList={user.followers.map((e) => e.user)}
      />) : (<UsersDialog
        title='Following'
        open={viewModal}
        onClose={closeModal}
        usersList={user.followings.map((e) => e.following_user)}
      />)}
      <div className='border-t sm:ml-8 sm:mr-14'>
        {/* tabs */}
        <div className='flex gap-12 justify-center'>
          <span
            onClick={() => handleTabClick('posts')}
            className={`${selectedTab === 'posts' ? 'border-t border-black' : 'text-gray-400'} py-3 cursor-pointer flex items-center text-[13px] uppercase gap-3 tracking-[1px] font-medium`}
          >
          {/* postsIconFill */}
            {t('posts')}
          </span>
          <span
            onClick={() => handleTabClick('advertisements')}
            className={`${selectedTab === 'advertisements' ? 'border-t border-black' : 'text-gray-400'} py-3 cursor-pointer flex items-center text-[13px] uppercase gap-3 tracking-[1px] font-medium`}
          >
          {/* adsIcon */}
            {t('ads')}
          </span>
        </div>

        {/* posts grid data */}
        {user && <PostContainer user_id={user.id} usage='profile' tab={selectedTab} />}
      </div>
    </div>) : (<NotFound />)}
  </>);
};
export default Profile;
