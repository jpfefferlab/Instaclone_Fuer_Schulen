import MetaData from '../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import PostReportContainer from './PostReportContainer';
import UserReportContainer from './UserReportContainer';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { clearErrors } from '../../actions/moderationActions';
import { DELETE_POST_RESET } from '../../constants/postConstants';
import {
  REPORT_IGNORE_RESET,
  USER_RESTRICT_CREATE_RESET,
  USER_RESTRICT_DELETE_RESET,
} from '../../constants/moderationConstants';

const Moderation = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [selectedTab, setSelectedTab] = useState('posts');
  const {
    error,
    moderationType,
    success,
  } = useSelector((state) => state.moderation);


  useEffect(() => {
    if (error) {
      switch (moderationType) {
        case 'report':
          toast.error(t('report_ignore_error'));
          break;
        case 'post':
          toast.error(t('post_delete_error'));
          break;
        case 'user-restrict':
          toast.error(t('user_restrict_error'));
          break;
        case 'user-unrestrict':
          toast.error(t('user_unrestrict_error'));
          break;
      }
      dispatch(clearErrors);
    }
    if (success) {
      switch (moderationType) {
        case 'report':
          toast.success(t('report_ignore_success'));
          dispatch({ type: REPORT_IGNORE_RESET });
          break;
        case 'post':
          toast.success(t('post_deleted'));
          dispatch({ type: DELETE_POST_RESET });
          break;
        case 'user-restrict':
          toast.success(t('user_restrict_success'));
          dispatch({ type: USER_RESTRICT_CREATE_RESET });
          break;
        case 'user-unrestrict':
          toast.success(t('user_unrestrict_success'));
          dispatch({ type: USER_RESTRICT_DELETE_RESET });
          break;
      }
    }
  }, [error, success]);

  return (
    <>
      <MetaData title='Moderation • Instaclone' />
      <div className='flex flex-col items-center h-full md:w-4/5 lg:w-2/3 xl:w-2/3 mx-auto'>
        <span className='text-3xl mt-5'>{t('moderation_page_title')}</span>
        <div className='border-t sm:ml-8 sm:mr-14 w-full mt-5'>
          <div className='flex flex-row justify-center gap-12'>
          <span
            onClick={() => setSelectedTab('posts')}
            className={`${
              selectedTab === 'posts' ? 'border-t border-black' : ''
            } py-3 cursor-pointer flex items-center text-[13px] uppercase gap-3 tracking-[1px] font-medium`}
          >
            {/* reportsIcon */}
            {t('reported_posts_tab')}
          </span>
            <span
              onClick={() => setSelectedTab('users')}
              className={`${
                selectedTab === 'users' ? 'border-t border-black' : ''
              } py-3 cursor-pointer flex items-center text-[13px] uppercase gap-3 tracking-[1px] font-medium`}
            >
            {/* reportsIcon */}
              {t('reported_users_tab')}
          </span>
          </div>
        </div>
        {/* Content for the selected tab */}
        <div className='w-full'>
          {selectedTab === 'posts' && (
            <PostReportContainer />
          )}
          {selectedTab === 'users' && (
            <UserReportContainer />
          )}
        </div>
      </div>
    </>
  );

};

export default Moderation;
