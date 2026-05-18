import React, {useEffect, useRef, useState} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { clearErrors, getAllPosts, getNewsfeed } from '../../actions/postAction';
import {
  ALL_POSTS_RESET,
  DELETE_COMMENT_RESET,
  DELETE_POST_RESET,
  DELETE_TAG_RESET,
  EDIT_POST_RESET,
  LIKE_UNLIKE_POST_RESET,
  NEW_COMMENT_RESET,
  NEWSFEED_RESET,
  SAVE_UNSAVE_POST_RESET,
} from '../../constants/postConstants';
import { useTranslation } from 'react-i18next';
import SkeletonPost from '../Layouts/SkeletonPost';
import SpinLoader from '../Layouts/SpinLoader';
import InfiniteScroll from 'react-infinite-scroll-component';
import PostItem from './PostItem';
import i18n from '../../i18n';
import moment from 'moment';
import NewsfeedChart from "./NewsfeedChart";
import AlgorithmQuickSwitch from "./AlgorithmQuickSwitch";
import NewsfeedSocialGraph from "./NewsfeedSocialGraph";
import ToggleSidebar from "./ToggleSidebar";

const PostContainer = ({ user_id, usage, tab = 'posts' }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isMobile, setIsMobile] = useState(false);

  const { loading, error, posts, totalPosts, nextPageNumber } = useSelector((state) => {
    moment.locale(i18n.language);
    if (usage === 'profile') {
      return state.allPosts;
    } else {
      return state.newsfeed;
    }
  });

  const { user } = useSelector((state) => state.user);

  const {
    error: likeError, success: likeSuccess, likeType: likeType,
  } = useSelector((state) => state.likePost);

  const { error: commentError, success: commentSuccess } = useSelector((state) => state.newComment);

  const {
    error: saveError, success: saveSuccess, message: saveMessage,
  } = useSelector((state) => state.savePost);

  const { error: deleteError, success: deleteSuccess } = useSelector((state) => state.deletePost);

  const { error: deleteTagError, success: deleteTagSuccess } = useSelector((state) => state.deleteTag);

  const { error: deleteCommentError, success: deleteCommentSuccess } = useSelector((state) => state.deleteComment);

  const { error: editPostError, success: editPostSuccess } = useSelector((state) => state.editPost);

  useEffect(() => {
    if (error) {
      toast.error(t('error'));
      dispatch(clearErrors());
    }
    if (usage === 'profile') {
      dispatch(getAllPosts(user_id, tab));
      dispatch({ type: ALL_POSTS_RESET });
    } else {
      dispatch(getNewsfeed());
      dispatch({ type: NEWSFEED_RESET });
    }
  }, [user_id, error, tab]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 720);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // console.log(posts)
  }, [posts]);

  useEffect(() => {
    if (likeError) {
      toast.error(t('like_error'));
      dispatch(clearErrors());
    }
    if (likeSuccess) {
      if (likeType) {
        toast.success(t('liked'));
      } else {
        toast.success(t('unliked'));
      }
      dispatch({ type: LIKE_UNLIKE_POST_RESET });
    }
    if (commentError) {
      toast.error(t('comment_error'));
      dispatch(clearErrors());
    }
    if (commentSuccess) {
      toast.success(t('comment_added'));
      dispatch({ type: NEW_COMMENT_RESET });
    }
    if (saveError) {
      toast.error(saveError);
      dispatch(clearErrors());
    }
    if (saveSuccess) {
      toast.success(saveMessage);
      dispatch({ type: SAVE_UNSAVE_POST_RESET });
    }
    if (deleteError) {
      toast.error(t('post_delete_error'));
      dispatch(clearErrors());
    }
    if (deleteSuccess) {
      toast.success(t('post_deleted'));
      dispatch({ type: DELETE_POST_RESET });
    }
    if (deleteTagError) {
      toast.error(t('tag_delete_error'));
      dispatch(clearErrors());
    }
    if (deleteTagSuccess) {
      toast.success(t('tag_delete_success'));
      dispatch({ type: DELETE_TAG_RESET });
    }
    if (deleteCommentError) {
      toast.error(t('comment_delete_error'));
      dispatch(clearErrors());
    }
    if (deleteCommentSuccess) {
      toast.success(t('comment_delete_success'));
      dispatch({ type: DELETE_COMMENT_RESET });
    }
    if (editPostError) {
      toast.error(t('post_edit_error'));
      dispatch(clearErrors());
    }
    if (editPostSuccess) {
      toast.success(t('post_edit_success'));
      dispatch({ type: EDIT_POST_RESET });
    }
  }, [likeSuccess, likeError, commentError, commentSuccess, saveError, saveSuccess, saveMessage, deleteError, deleteSuccess, deleteTagError, deleteTagSuccess, deleteCommentError, deleteCommentSuccess, editPostError, editPostSuccess]);

  const fetchMorePosts = () => {
    if (nextPageNumber && usage === 'profile') {
      dispatch(getAllPosts(user_id, tab, nextPageNumber));
    } else if (nextPageNumber && usage === 'feed') {
      dispatch(getNewsfeed(nextPageNumber));
    } else {
      console.log('fetched all posts');
    }
  }

  let component;
  if (posts.length === 0) {
    return (
      <div
        className='bg-white mt-2 mb-10 drop-shadow-sm rounded flex sm:flex-row flex-col sm:gap-0 gap-5 sm:p-0 p-4 items-center justify-between'>
        <div className='mt-5 mb-5 mx-auto flex flex-col items-center justify-center'>
          <h4 className='font-medium text-lg sm:text-xl'>
            {t('start_capture_header')}
          </h4>
        </div>
      </div>
    );
  }

  if (usage === 'profile') {
    component = (<>
      {loading && <SpinLoader />}
      <InfiniteScroll
        dataLength={posts.length}
        next={fetchMorePosts}
        hasMore={posts.length !== totalPosts}
        loader={<SpinLoader />}
      >
        <div
          className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} ${isMobile ? 'gap-1' : 'gap-1 sm:gap-2'} my-1 mb-8`}>
          {posts.map((post) => (<div key={post.id} className='post-item-container'>
            <PostItem
              {...post}
              usage={usage}
            />
          </div>))}
        </div>
      </InfiniteScroll>
    </>);

  } else {
    component = (<>
      {loading && Array(5)
          .fill('')
          .map((el, i) => <SkeletonPost key={i}/>)}

      {
        user.settings.newsfeed_algorithm === 'ALGORITHM_3' &&
          <>
            <ToggleSidebar smallHint={t('show_change_algorithm')} position='left'>
              <AlgorithmQuickSwitch />
            </ToggleSidebar>

            {
              (user.settings.newsfeed_xray_mode || user.settings.newsfeed_social_graph_mode) &&

                  <ToggleSidebar smallHint={t('show_newsfeed_visualization')} position='right'>
                    {
                        user.settings.newsfeed_xray_mode &&
                        <NewsfeedChart />
                    }

                    {
                        user.settings.newsfeed_social_graph_mode &&
                            <NewsfeedSocialGraph />
                    }
                  </ToggleSidebar>
            }
          </>
      }



      <InfiniteScroll
          dataLength={posts.length}
          next={fetchMorePosts}
          hasMore={posts.length !== totalPosts}
          loader={<SpinLoader/>}
      >

        <div className='w-full h-full mt-1 sm:mt-6 flex flex-col space-y-1 '>
          {posts?.map((post) => (<PostItem
              key={post.id}
              {...post}
              usage={usage}
          />))}
        </div>
      </InfiniteScroll>
    </>);
  }
  return component;
};

export default PostContainer;
