import React, { useEffect, useState } from 'react';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ModeCommentIcon from '@mui/icons-material/ModeComment';
import { Dialog } from '@mui/material';
import { Link } from 'react-router-dom';
import { commentIcon } from '../Home/SvgIcons';
import { useDispatch, useSelector } from 'react-redux';
import { likePost, unlikePost } from '../../actions/postAction';
import { useTranslation } from 'react-i18next';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import UsersDialog from '../Layouts/UsersDialog';
import ScrollToBottom from 'react-scroll-to-bottom';
import { MoreHoriz } from '@mui/icons-material';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import EditPost from './EditPost';
import OptionModal from './PostItem/OptionModal';
import CommentDisplay from './PostItem/CommentDisplay';
import CommentInput from './PostItem/CommentInput';
import TaggedImage from './PostItem/TaggedImage';
import { toast } from 'react-toastify';
import empty_profile from '../../assets/images/empty_profile.png';
import Metadata from "./PostItem/Metadata";
import {followUser, unfollowUser} from "../../actions/userAction";
import CreatedOn from "./PostItem/CreatedOn";
import moment from "moment";
import { getImageSource } from '../../utils/imageUtils';

const PostItem = ({
                    id, caption, likes, comments, content, creator, created_on, type, url, image_tags,
                    is_from_followed_user,
                    affinity_score, affinity_like_count, affinity_comment_count,
                    popularity_score, time_factor_score, edge_rank_score,
                    usage
                  }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const commentInputRef = React.createRef();

  const { user } = useSelector((state) => state.user);
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [optionModal, setOptionModal] = useState(false);
  const [lastLikeTime, setLastLikeTime] = useState(0);
  const [usersDialog, setUsersDialog] = useState(false);
  const [editPostModal, setEditPostModal] = useState(false);
  const [personalLikeID, setPersonalLikeID] = useState(undefined);

  const handleLike = async () => {
    const currentTime = Date.now();
    if (currentTime - lastLikeTime < 5000) {
      toast.warning(t('like_timeout'));
      return;
    }
    setLastLikeTime(currentTime);
    if (!personalLikeID) {
      await dispatch(likePost(id));
    } else {
      await dispatch(unlikePost(personalLikeID, id));
      setPersonalLikeID(undefined);
    }
  };

  const handleLikeModal = () => {
    setUsersDialog(true);
  };

  const createLike = () => {
    if (!personalLikeID) {
      handleLike();
    }
  };

  const handleUsersClose = () => setUsersDialog(false);

  const handleIsExpanded = () => setIsExpanded(!isExpanded);


  useEffect(() => {
    const my_like_id = likes.find((u) => u.creator.id === user.id);
    if (my_like_id) {
      setPersonalLikeID(my_like_id.id);
    }
  }, [likes]);


  let itemComponent;
  if (usage === 'feed') {
    itemComponent = (
      <div className='relative pt-5'>
        {user.settings.newsfeed_algorithm === 'ALGORITHM_3' && is_from_followed_user === false && type !== 'ADVERTISEMENT' ? (
            <div className='flex justify-between p-2 pt-0 text-gray-600'>
              <div className='flex-col'>{t('suggested_post')}</div>
            </div>
        ) : (
            <></>
        )}
        <div className='flex flex-col border rounded bg-white relative'>
          <div className='flex justify-between px-3 py-2.5 border-b items-center'>
            <div className='flex space-x-3 items-center'>
              <Link to={`/${creator.username}`}>
                <img
                  draggable='false'
                  className='w-10 h-10 rounded-full object-cover'
                  src={creator.profile?.picture ? `data:image/jpeg;base64,${creator.profile.picture}` : empty_profile}
                  alt='avatar-home'
                />
              </Link>
              <div className='flex flex-col'>
                <Link
                  to={`/${creator.username}`}
                  className='text-black text-sm font-semibold'
                >
                  {creator.username}
                </Link>
                {type === 'ADVERTISEMENT' ? (<div className='text-black text-xs'>{t('post_sponsored')}</div>) : (<></>)}
              </div>
            </div>

            <div>
              {
                  user.settings.newsfeed_xray_mode && user.settings.newsfeed_algorithm === 'ALGORITHM_3' &&
                  <span className="text-black text-sm font-semibold pr-2">
                     ID: {id}
                  </span>
              }

              <span onClick={() => setOptionModal(true)} className='cursor-pointer'>
                <MoreHoriz/>
              </span>
            </div>
          </div>
          {/* Options */}
          <OptionModal id={id} image_tags={image_tags} creator={creator} type={type} setOptionModal={setOptionModal}
                       optionModal={optionModal} setEditPostModal={setEditPostModal} />
          <EditPost Post={{ id, content, image_tags, caption }} editPostModal={editPostModal}
                    setEditPostModal={setEditPostModal} />

          {/* image container */}
          <TaggedImage content={content} image_tags={image_tags} type={type} usage={usage} url={url}
                       createLike={createLike} />

          {/* like comment container */}
          <div className='flex flex-col px-4 space-y-1 border-b pb-2 mt-1'>
            {/* icons container */}
            <div className='flex items-center justify-between py-2'>
              <div className='flex space-x-4'>
                <button onClick={handleLike}>
                  {personalLikeID ? <FavoriteOutlinedIcon style={{color: '#d32f2f'}}/> : <FavoriteBorderOutlinedIcon/>}
                </button>
                <button onClick={() => commentInputRef.current.focus()}>
                  {commentIcon}
                </button>
              </div>
            </div>

            {/* Likes  */}
            <span
                onClick={handleLikeModal}
                className='font-semibold text-sm cursor-pointer'
            >
              {likes.length} {t('likes')}
            </span>
            <UsersDialog
                title='Likes'
                open={usersDialog}
                onClose={handleUsersClose}
                usersList={likes.map((e) => e.creator)}
            />
            {/* Caption */}
            <div className='flex space-x-1'>
              {isExpanded ? (<><Link
                  to={`/${creator.username}`}
                  className='text-sm font-semibold hover:underline'
              >
                {creator.username}
              </Link>
                <span
                    className='text-sm truncate'
                    onClick={handleIsExpanded}
                >{caption}</span></>) : (<div><Link
                  to={`/${creator.username}`}
                  className='text-sm font-semibold hover:underline'
              >
                {creator.username}
              </Link>
                <span className='text-sm whitespace-pre-line' onClick={handleIsExpanded}> {caption} </span>
              </div>)}
            </div>
            {/* Metadata */}
            {
              user.settings.newsfeed_xray_mode && user.settings.newsfeed_algorithm === 'ALGORITHM_3' &&

              <Metadata type={type}
                        post_id={id}
                        xray_mode={user.settings.newsfeed_xray_mode}
                        creator_username={creator.username}
                        affinity_score={affinity_score}
                        affinity_like_count={affinity_like_count}
                        affinity_comment_count={affinity_comment_count}
                        popularity_score={popularity_score}
                        time_factor_score={time_factor_score}
                        edge_rank_score={edge_rank_score}>
              </Metadata>
            }
            {/* Comments Box*/}
            <ScrollToBottom className='w-full h-50 overflow-y-auto '>
              <CommentDisplay id={id} comments={comments} creator={creator} created_on={created_on} usage={usage}/>
            </ScrollToBottom>
          </div>
          {/* Comment Input Container */}
          <CommentInput id={id} commentInputRef={commentInputRef}/>
        </div>
    </div>);
  } else if (usage === 'profile') {
    // Profile PostItem
    itemComponent = (<div>
      <div
          onClick={() => setOpen(true)}
          className='group w-full h-32 sm:h-72 max-h-72 flex justify-center items-center bg-gray-100 hover:bg-black cursor-pointer relative z-0'
      >
        <img
          draggable='false'
          loading='lazy'
          className='hover:opacity-75 group-hover:opacity-75 cursor-pointer object-cover h-full w-full'
          src={getImageSource(content)}
          alt='Post'
        />
        <div className='hidden group-hover:flex text-white absolute pointer-events-none gap-4'>
          <span>
            <FavoriteIcon /> {likes.length}
          </span>
          <span>
            <ModeCommentIcon /> {comments.length}
          </span>
        </div>
      </div>

      <Dialog open={open} onClose={() => {
        setOpen(false);
      }} maxWidth='xl'>
        <div className='flex sm:flex-row max-w-7xl'>
          <TaggedImage content={content} image_tags={image_tags} type={type} usage={usage} url={url}
                       createLike={createLike} />

          <div className='flex flex-col justify-between border w-full max-w-xl rounded bg-white'>
            {/* id with menu icon */}
            <div className='flex justify-between px-3 py-2 border-b items-center'>
              {/* icon with name */}
              <div className='flex space-x-3 items-center'>
                <Link to={`/${creator.username}`}>
                  <img
                    draggable='false'
                    className='w-10 h-10 rounded-full object-cover'
                    src={creator.profile?.picture ? `data:image/jpeg;base64,${creator.profile.picture}` : empty_profile}
                    alt='avatar'
                  />
                </Link>
                <Link
                  to={`/${creator.username}`}
                  className='text-black text-sm font-semibold hover:underline'
                >
                  {creator.username}
                </Link>
                {type === 'ADVERTISEMENT' ? (<div className='text-black text-xs'>{t('post_sponsored')}</div>) : (<></>)}
              </div>
              <span
                onClick={() => setOptionModal(true)} className='cursor-pointer'>
                <MoreHoriz />
              </span>
            </div>
            {/* Caption */}
            <div className='p-4 w-full flex-1 overscroll-x-hidden overflow-y-auto mt-0'>
              <div className='flex items-left space-x-1 mb-3 ' style={{ height: 'auto' }}>
                <img
                  draggable='false'
                  className='rounded-full object-cover mr-2.5'
                  style={{ width: '28px', height: '28px', flexShrink: 0 }}
                  src={creator.profile?.picture ? `data:image/jpeg;base64,${creator.profile.picture}` : empty_profile}
                  alt='avatar'
                />
                <div className='flex flex-col items-start'>
                  <div>
                    <Link
                      to={`/${creator.username}`}
                      className='text-sm font-semibold hover:underline'
                    >
                      {creator.username}
                    </Link>
                    <span className='text-sm whitespace-pre-line'> {caption} </span>

                  </div>
                  <span
                    className='text-gray-400 text-xs'>{moment(created_on).fromNow()}
                  </span>
                </div>
              </div>

              <CommentDisplay id={id} comments={comments} creator={creator} created_on={created_on} usage={usage} />

            </div>

            {/* like comment container */}
            <div className='flex flex-col px-3 space-y-1 border-b border-t pb-2'>
              {/* icons container */}
              <div className='flex items-center justify-between py-2'>
                {/* left icons container */}
                <div className='flex space-x-4'>
                  <button onClick={handleLike}>
                    {personalLikeID ? <FavoriteOutlinedIcon style={{ color: '#d32f2f' }} /> :
                      <FavoriteBorderOutlinedIcon />}
                  </button>
                  <button onClick={() => commentInputRef.current.focus()}>
                    {commentIcon}
                  </button>
                  {/*shareIcon*/}
                </div>

              </div>
              {/* likes  */}
              <span
                onClick={handleLikeModal}
                className='font-semibold text-sm cursor-pointer'
              >
              {likes.length} {t('likes')}
              </span>
              <UsersDialog
                title='Likes'
                open={usersDialog}
                onClose={handleUsersClose}
                usersList={likes.map((e) => e.creator)}
              />
              {/* time */}
              <CreatedOn created_on={created_on}></CreatedOn>
              {/* comment input */}
              <CommentInput id={id} commentInputRef={commentInputRef} />
            </div>
          </div>

          <OptionModal id={id} image_tags={image_tags} creator={creator} type={type} setOptionModal={setOptionModal}
                       optionModal={optionModal} setEditPostModal={setEditPostModal} />
          <EditPost Post={{ id, content, image_tags, caption }} editPostModal={editPostModal}
                    setEditPostModal={setEditPostModal} />
        </div>

      </Dialog>
    </div>);
  } else if (usage === 'adPreview') {
    itemComponent = (<div className='flex flex-col border rounded bg-white relative'>
      <div className='flex justify-between px-3 py-2.5 border-b items-center'>
        <div className='flex space-x-3 items-center'>
          <Link to={`/${creator.username}`}>
            <img
              draggable='false'
              className='w-10 h-10 rounded-full object-cover'
              src={creator.profile?.picture ? `data:image/jpeg;base64,${creator.profile.picture}` : empty_profile}
              alt='avatar-home'
            />
          </Link>
          <div className='flex flex-col'>
            <Link
              to={`/${creator.username}`}
              className='text-black text-sm font-semibold'
            >
              {creator.username}
            </Link>
            <div className='text-black text-xs'>{t('post_sponsored')}</div>
          </div>
        </div>
      </div>

      {/* post image container */}
      <div
        className='relative flex items-center justify-center'
      >
        <img
          draggable='false'
          loading='lazy'
          className='w-full h-full object-cover object-center'
          src={getImageSource(content)}
          alt='post image'
        />
      </div>

      <a href={url} target='_blank' rel='noopener noreferrer'>
        <div className='flex justify-between w-full h-auto p-3 px-4 bg-sky-900'>
          <div className='text-sm font-semibold text-gray-100'>{t('shop_now')}</div>
          <ChevronRightRoundedIcon style={{ color: '#f3f4f6' }} />
        </div>
      </a>
      <div className='flex flex-col px-4 space-y-1 border-b pb-2 mt-1'>
        <div className='flex items-center justify-between py-2'>
          <div className='flex space-x-4'>
            <div>
              {<FavoriteBorderOutlinedIcon />}
            </div>
            <div>
              {commentIcon}
            </div>
          </div>
        </div>
        <span
          className='font-semibold text-sm cursor-pointer'
        >
          {0} {t('likes')}
        </span>

        <div className='flex flex-auto space-x-1'>
          <Link
            to={`/${creator.username}`}
            className='text-sm font-semibold hover:underline'
          >
            {creator.username}
          </Link>
          <span
            className={`text-sm ${isExpanded ? '' : 'truncate'}`}
            onClick={handleIsExpanded}>{caption}</span>
        </div>
      </div>
    </div>);
  }
  return itemComponent;
};

export default PostItem;
