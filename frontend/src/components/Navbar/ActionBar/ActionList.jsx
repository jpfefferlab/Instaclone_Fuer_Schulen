import { useDispatch, useSelector } from 'react-redux';
import { clearErrors, getActions } from '../../../actions/postAction';
import { useEffect } from 'react';
import ActionUserItem from './ActionUserItem';
import { ClickAwayListener } from '@mui/material';
import SpinLoader from '../../Layouts/SpinLoader';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';

const ActionList = ({ setActionToggle }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { actions, nextActionPage, loading, error, totalActions } = useSelector((state) => state.actions);

  const loadMoreActions = () => {
    if (loading || !nextActionPage) return;
    dispatch(getActions(nextActionPage));
  };

  useEffect(() => {
    const lastFetchTime = localStorage.getItem('lastActionsFetchTime');
    const currentTime = new Date().getTime();
    if (!lastFetchTime || currentTime - lastFetchTime >= 60000) {
      dispatch({ type: 'ACTION_RESET' });
      dispatch(getActions(1));
      localStorage.setItem('lastActionsFetchTime', currentTime.toString());
    }
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(t('action_error'));
      dispatch(clearErrors());
    }
  }, [error]);

  return (<ClickAwayListener onClickAway={() => setActionToggle(false)}>
    <div className='absolute bg-white rounded top-12 right-0 md:w-52 drop-shadow md:top-14 border'>
      <div id='actionListRef'
           className={'justify-center items-center absolute  overflow-y-auto overflow-x-hidden flex flex-col w-[23rem] -left-11 bg-white drop-shadow-xl rounded'}>
        <InfiniteScroll next={loadMoreActions} hasMore={totalActions !== actions.length} loader={<SpinLoader />}
                        dataLength={actions.length} scrollableTarget='actionListRef' height={300}
                        className='w-[23rem]'>
          {actions.length === 0 ? (
            <span
              className=' flex mt-3 text-gray-400 text-sm justify-center align-center'>{t('no_actions')}</span>) : (actions.map((action) => (
            <ActionUserItem key={action.id} {...action} />)))}
        </InfiniteScroll>
      </div>
    </div>
  </ClickAwayListener>);
};

export default ActionList;
