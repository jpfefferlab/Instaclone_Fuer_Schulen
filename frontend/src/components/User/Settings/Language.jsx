import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { clearErrors, loadUser } from '../../../actions/userAction';
import { UPDATE_PROFILE_RESET } from '../../../constants/userConstants';
import MetaData from '../../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import 'moment/locale/de';


const Language = () => {
  const { t, i18n } = useTranslation();

  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.user);
  const { error, isUpdated, loading } = useSelector((state) => state.profile);

  const [language, setLanguage] = useState(i18n.language);
  const handleUpdate = (e) => {
    e.preventDefault();
    i18n.changeLanguage(language);
    moment.locale(language);
    toast.success(t('language_changed'));
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (isUpdated) {
      toast.success(t('profile_updated'));
      dispatch(loadUser());

      dispatch({ type: UPDATE_PROFILE_RESET });
    }
  }, [dispatch, user, error, isUpdated]);

  return (<>
    <MetaData title='Change Language • Instaclone' />

    <form
      onSubmit={handleUpdate}
      encType='multipart/form-data'
      className='flex flex-col gap-4 py-4 px-4 sm:py-10 sm:px-24 sm:w-3/4'
    >
      <div className='flex w-full gap-8 text-right items-center'>
        <span className='w-1/4 font-semibold'>{t('language')}:</span>
        <select
          value={language}
          className='border rounded p-1 w-3/4'
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value='en'>English</option>
          <option value='de'>Deutsch</option>
        </select>
      </div>
      <button
        type='submit'
        disabled={loading}
        className='bg-primary-blue font-medium rounded text-white py-2 w-40 mx-auto text-sm'
      >
        {t('save')}
      </button>
    </form>
  </>);
};

export default Language;
