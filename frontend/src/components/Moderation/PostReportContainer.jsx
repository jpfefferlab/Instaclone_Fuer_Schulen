import MetaData from '../Layouts/MetaData';
import SpinLoader from '../Layouts/SpinLoader';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { getPostReports } from '../../actions/moderationActions';
import PostReportItem from './PostReportItem';
import { useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { toast } from 'react-toastify';
import { CLEAR_ERRORS, POST_REPORT_RESET } from '../../constants/moderationConstants';

const PostReportContainer = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, reports, error, totalReports, nextPageNumber } = useSelector((state) => state.postReports);

  const fetchPostReports = () => {
    dispatch(getPostReports(nextPageNumber));
  };

  useEffect(() => {
    dispatch(getPostReports());
    dispatch({ type: POST_REPORT_RESET });
  }, []);


  useEffect(() => {
    if (error) {
      toast.error('post_report_error');
      dispatch({ type: CLEAR_ERRORS });
    }
  }, [error]);

  return (<>
    <MetaData title={`${t('post_report_title')} • Instaclone`} />
    <>
      {reports.length === 0 && !loading &&
        <span className='flex mt-5 justify-center align-center text-2xl'>{t('no_post_reports')} </span>}
      <InfiniteScroll next={fetchPostReports} hasMore={reports.length !== totalReports} loader={<SpinLoader />}
                      dataLength={reports.length}>
        {reports.map((report) => (<div key={report.id} className='mx-auto'>
          <PostReportItem
            {...report}
          />
        </div>))}
      </InfiniteScroll>
    </>
  </>);
};

export default PostReportContainer;
