import MetaData from '../Layouts/MetaData';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { getRestrictedUsers } from '../../actions/moderationActions';
import { useEffect } from 'react';
import { toast } from 'react-toastify';
import SpinLoader from '../Layouts/SpinLoader';
import InfiniteScroll from 'react-infinite-scroll-component';
import UserReportItem from './UserReportItem';
import { CLEAR_ERRORS, USER_RESTRICT_RESET } from '../../constants/moderationConstants';

const UserReportContainer = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, users, error, totalUsers, nextPageNumber } = useSelector((state) => state.restrictUser);
  const fetchRestrictedUsers = () => {
    dispatch(getRestrictedUsers(nextPageNumber));
  };

  useEffect(() => {
    dispatch(getRestrictedUsers());
    dispatch({ type: USER_RESTRICT_RESET });
  }, []);

  useEffect(() => {
    if (error) {
      toast.error('user_restrict_retrieval_error');
      dispatch({ type: CLEAR_ERRORS });
    }
  }, [error]);

  return (<>
    <MetaData title={`${t('user_report_title')} • Instaclone`} />
    <>
      {users.length === 0 && !loading &&
        <span className='flex mt-5 justify-center align-center text-2xl'>{t('no_users_restricted')} </span>}
      <InfiniteScroll next={fetchRestrictedUsers} hasMore={users.length !== totalUsers} loader={<SpinLoader />}
                      dataLength={users.length}>
        {users.map((user) => (<div key={user.id} className='mx-auto'>
          <UserReportItem
            {...user}
          />
        </div>))}
      </InfiniteScroll>
    </>
  </>);
};

export default UserReportContainer;
