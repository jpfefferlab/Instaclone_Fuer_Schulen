import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutUser } from '../../actions/userAction';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ClickAwayListener } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

const ProfileDetails = ({ setProfileToggle }) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.user);
  const tabs = [{
    title: t('profile_title'), icon: <AccountCircleOutlinedIcon fontSize='medium' />, redirect: `/${user.username}`,
  }, /**{
   title: t('saved_title'), icon: savedIcon, redirect: `/${user.username}`,
   },**/ {
    title: t('settings_title'), icon: <SettingsOutlinedIcon fontSize='medium' />, redirect: '/accounts/edit',
  }];

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
    toast.success(t('logout_success'));
  };

  return (<ClickAwayListener onClickAway={() => setProfileToggle(false)}>
    <div className='absolute md:w-40 bg-white rounded top-12 drop-shadow border'>
      <div className='flex flex-col w-full overflow-hidden'>
        {tabs.map((el, i) => (<Link
          component='button'
          onClick={() => setProfileToggle(false)}
          to={el.redirect}
          className='flex items-center gap-3 p-2.5 text-sm pl-4 cursor-pointer hover:bg-gray-50'
          key={i}
        >
          {el.icon}
          {el.title}
        </Link>))}
        <button
          onClick={handleLogout}
          className='flex rounded-b border-t-2 items-center gap-3 p-2.5 text-sm pl-4 cursor-pointer hover:bg-gray-50'
        >
          {t('logout_button')}
        </button>
      </div>
    </div>
  </ClickAwayListener>);
};

export default ProfileDetails;
