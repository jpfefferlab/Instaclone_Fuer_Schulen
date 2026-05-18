import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import ProfileDetails from './ProfileDetails';
import PostDetails from './Postdetails';
import NewStory from '../Posts/NewStory';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserPoints } from '../../actions/workbookAction';
import SearchBox from './SearchBar/SearchBox';
import ActionList from './ActionBar/ActionList';
import { ACTION_RESET } from '../../constants/postConstants';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FlagIcon from '@mui/icons-material/Flag';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined';
import CreateIcon from '@mui/icons-material/Create';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NewPost from '../Posts/NewPost';
import { postUploadOutline } from './SvgIcons';
import logo from '../../assets/images/instaclone2.png';
import empty_profile from '../../assets/images/empty_profile.png';
import PointsDisplay from '../Rewards/PointsDisplay';

const Header = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.user);
  const points = useSelector((state) => state.userPoints.points); //fetch from userPoints (store)

  const [profileToggle, setProfileToggle] = useState(false);
  const [postToggle, setPostToggle] = useState(false);
  const [actionToggle, setActionToggle] = useState(false);
  const [newPost, setNewPost] = useState(false);
  const [newStory, setNewStory] = useState(false);

  const location = useLocation();
  const [onHome, setOnHome] = useState(false);
  const [onModeration, setOnModeration] = useState(false);
  const [onAnalytics, setOnAnalytics] = useState(false);
  const [onWorkbook, setOnWorkbook] = useState(false);

  useEffect(() => {
    setOnHome(location.pathname === '/');
    setOnModeration(location.pathname === '/moderation');
    setOnAnalytics(location.pathname === '/analytics');
    setOnWorkbook(location.pathname === '/workbook');
  }, [location]);

  useEffect(() => {
    dispatch({ type: ACTION_RESET });
  }, [user, dispatch]);

  useEffect(() => {
    dispatch(fetchUserPoints());
  }, [dispatch]);

  const handleLogoClick = () => {
    if (onHome) {
      window.location.reload();
    }
  };

  const handlePostClick = () => {
    if (user.restricted_view) {
      toast.error(t('new_post_not_allowed'));
    } else {
      setPostToggle(!postToggle);
    }
  };

  return (
    <nav className='sticky top-0 w-full h-16 border-b bg-white z-100'>
      {/* <!-- navbar container --> */}
      <div className='flex flex-row justify-between items-center py-2 pl-0 pr-2 sm:w-full sm:py-2 sm:px-4 md:w-full md:py-2 md:px-6 xl:w-4/6 xl:py-3 xl:px-8 mx-auto'>
        {/* <!-- logo --> */}
        <Link className='hidden sm:flex max-w-[90px]' to='/'>
          <img
            draggable='false'
            className='max-w-[90px] h-full object-contain'
            src={logo}
            alt='instaclone-logo'
            onClick={handleLogoClick}
          />
        </Link>

        <SearchBox />

        {/* <!-- icons container  --> */}
        <div className='flex items-center space-x-4 relative'>
          <Link to='/'>
            {profileToggle || !onHome ? <HomeOutlinedIcon /> : <HomeIcon />}
          </Link>
          <div onClick={handlePostClick} className='cursor-pointer'>
            {postUploadOutline}
            {postToggle && (
              <PostDetails
                setNewPost={setNewPost}
                setPostToggle={setPostToggle}
                setNewStory={setNewStory}
              />
            )}
          </div>
          <div
            onClick={() => {
              setActionToggle(!actionToggle);
            }}
            className='cursor-pointer'
          >
            {actionToggle ? (
              <FavoriteOutlinedIcon />
            ) : (
              <FavoriteBorderOutlinedIcon />
            )}
            {actionToggle && <ActionList setActionToggle={setActionToggle} />}
          </div>
          <Link to='/analytics'>
            {onAnalytics ? <AnalyticsIcon /> : <AnalyticsOutlinedIcon />}
          </Link>
          {user.report_view && (
            <Link to={'/moderation'}>
              {onModeration ? <FlagIcon /> : <FlagOutlinedIcon />}
            </Link>
          )}
          <Link to='/workbook'>
            {onWorkbook ? <CreateIcon /> : <CreateOutlinedIcon />}
          </Link>
          <div
            onClick={() => setProfileToggle(!profileToggle)}
            className='cursor-pointer flex-shrink-0'
          >
            <img
              draggable='false'
              loading='lazy'
              className='w-7 h-7 rounded-full object-cover'
              src={
                user.profile?.picture
                  ? `data:image/jpeg;base64,${user.profile.picture}`
                  : empty_profile
              }
              alt=''
            />
            {profileToggle && (
              <ProfileDetails setProfileToggle={setProfileToggle} />
            )}
          </div>
          <Link to='/shop'>
            <PointsDisplay amount={points} />
          </Link>
        </div>

        <NewPost newPost={newPost} setNewPost={setNewPost} />
        <NewStory newPost={newStory} setNewPost={setNewStory} />
      </div>
    </nav>
  );
};

export default Header;
