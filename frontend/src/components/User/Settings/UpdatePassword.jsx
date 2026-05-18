import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { clearErrors, loadUser, updatePassword } from '../../../actions/userAction';
import { UPDATE_PASSWORD_RESET } from '../../../constants/userConstants';
import MetaData from '../../Layouts/MetaData';
import { useTranslation } from 'react-i18next';

const UpdatePassword = () => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.user);
  const { error, isUpdated, loading } = useSelector((state) => state.profile);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordUpdate = (e) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.warn(t('password_legth_warning'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('match_warning'));
      return;
    }

    dispatch(updatePassword({ oldPassword, newPassword }));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (isUpdated) {
      toast.success(t('password_success'));
      dispatch(loadUser());
      navigate(`/${user?.username}`);

      dispatch({ type: UPDATE_PASSWORD_RESET });
    }
  }, [dispatch, error, isUpdated, navigate]);

  return (
    <>
      <MetaData title='Change Password • Instaclone' />

      <form
        onSubmit={handlePasswordUpdate}
        className='flex flex-col gap-4 py-8 px-16 sm:w-3/4'
      >
        <div className='flex items-center gap-8 ml-24'>
          <img
            draggable='false'
            className='w-11 h-11 rounded-full border object-cover'
            src={`data:image/jpeg;base64,${user.profile.picture}`}
            alt=''
          />
          <span className='text-2xl'>{user.username}</span>
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>Current Password</span>
          <input
            className='border rounded p-1 w-3/4'
            type='password'
            placeholder='Current Password'
            name='oldPassword'
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>New Password</span>
          <input
            className='border rounded p-1 w-3/4'
            type='password'
            placeholder='New Password'
            name='newPassword'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className='flex w-full gap-8 text-right items-center'>
          <span className='w-1/4 font-semibold'>Confirm New Password</span>
          <input
            className='border rounded p-1 w-3/4'
            type='password'
            placeholder='Confirm Password'
            name='confirmPassword'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button
          type='submit'
          disabled={loading}
          className='bg-primary-blue font-medium rounded text-white py-2 w-40 mx-auto text-sm'
        >
          Change Password
        </button>
      </form>
    </>
  );
};

export default UpdatePassword;
