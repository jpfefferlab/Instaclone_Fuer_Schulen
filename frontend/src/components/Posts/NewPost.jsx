import { Dialog, LinearProgress } from '@mui/material';
import { Picker } from 'emoji-mart';
import { BrowserView } from 'react-device-detect';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {addNewPost, clearErrors, getNewsfeed} from '../../actions/postAction';
import { getUserHistory, updateLastPost } from '../../actions/userAction';
import { fetchUserFeatures } from '../../actions/workbookAction';
import {NEW_POST_RESET, NEWSFEED_RESET} from '../../constants/postConstants';
import { emojiIcon } from '../Home/SvgIcons';
import { useTranslation } from 'react-i18next';
import { compressImage, toBase64 } from '../../utils/imageUtils';
import UserSearch from '../Navbar/UserSearch/UserSearch';
import SearchUserItem from '../Navbar/UserSearch/SearchUserItem';
import ShopButton from '../Rewards/Shop/ShopButton';
import empty_profile from '../../assets/images/empty_profile.png';

// Time the user has to wait between creating posts
const POST_COOLDOWN_TIME = 30 * 60 * 1000; // 30 min in milliseconds

const NewPost = ({ newPost, setNewPost }) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, success, error } = useSelector((state) => state.newPost);
  const { user } = useSelector((state) => state.user);
  const { lastPost } = useSelector((state) => state.history);
  const { features } = useSelector((state) => state.userFeatures || []);
  const [postImage, setPostImage] = useState('');
  const [postUpload, setPostUpload] = useState(null);
  const [postPreview, setPostPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [dragged, setDragged] = useState(false);
  const [tagPage, setTagPage] = useState(false);
  const [imageTags, setImageTags] = useState([]);
  const [nextTag, setNextTag] = useState(null);
  const [actualImageWidth, setActualImageWidth] = useState(0);
  const imageRef = useRef(null);
  const [userSelected, setUserSelected] = useState(false);
  // Tracks time since last post and if the user can create a new post
  const [canCreateUnlimitedPosts, setCanCreateUnlimitedPosts] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [newPostAvailableAt, setNewPostAvailableAt] = useState('');

  const handleDragChange = () => {
    setDragged(!dragged);
  };

  const handleNewEmoji = (event) => {
    setCaption(caption + event.native);
    setShowEmojis(false);
  };

  const handleFileChange = async (e) => {
    if (e.target.files[0].size > 5242880) {
      toast.error('File size cannot exceed 10mb');
    } else {
      setPostImage('');
      const compressedImage = await compressImage(e.target.files[0]);
      const prev = URL.createObjectURL(compressedImage);
      setPostPreview(prev);
      setPostUpload(compressedImage);
      const img = await toBase64(compressedImage);
      setPostImage('');

      const imageObj = new Image();
      imageObj.src = 'data:image/jpeg;base64,' + img.base64;
      imageObj.onload = () => {
        setActualImageWidth(imageObj.width);
      };
      setPostImage(img.base64);
    }
  };

  const handleImageClick = (e) => {
    const imgRect = imageRef.current.getBoundingClientRect();
    // Tags should be a max of 100px wide
    const tagHeight = 24;
    const tagWidth = 50;

    let offsetX = e.clientX - imgRect.left;
    let offsetY = e.clientY - imgRect.top;

    // Ensure tag is within bounds
    offsetX = Math.min(offsetX, imgRect.width - tagWidth);
    offsetY = Math.min(offsetY, imgRect.height - tagHeight);
    // Convert Tag to [0,1]
    const relativeX = offsetX / imgRect.width;
    const relativeY = offsetY / imgRect.height;

    if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
      const updatedTags = imageTags.filter(
        (tag) => tag.username !== nextTag.username
      );
      updatedTags.push({
        username: nextTag.username,
        user_id: nextTag.id,
        x: relativeX,
        y: relativeY,
      });
      setImageTags(updatedTags);
      setNextTag(null);
      setUserSelected(false);
    }
  };

  const onCloseModal = () => {
    setNewPost(false);
    setCaption('');
    setPostImage('');
    setPostPreview('');
    setPostUpload(null);
    setTagPage(false);
    setNextTag('');
    setImageTags([]);
    setUserSelected(false);
  };

  const newPostSubmitHandler = (e) => {
    e.preventDefault();
    if (!postImage) {
      toast.error(t('select_image_error'));
      return;
    }
    if (!caption.trim()) {
      toast.error(t('empty_caption_error'));
      return;
    }

    const formData = new FormData();

    formData.set('caption', caption);
    formData.set('content', postImage);
    if (postUpload) {
      formData.set('content_upload', postUpload, postUpload.name || 'post.jpg');
    }
    formData.set('tags', JSON.stringify(imageTags));
    dispatch(addNewPost(formData)).then((response) => {
      if (response?.created_on) {
        dispatch(updateLastPost(response.created_on));
        dispatch(getUserHistory);
        // Reload newsfeed to get the new edgerank scores
        dispatch(getNewsfeed());
        dispatch({ type: NEWSFEED_RESET });
      }
    });
  };

  const nextPageHandler = (e) => {
    e.preventDefault();

    if (!postImage) {
      toast.error(t('select_image_error'));
      return;
    }
    if (!caption.trim()) {
      toast.error(t('empty_caption_error'));
      return;
    }
    setTagPage(true);
  };

  const handleUserSelected = (selectedUser) => {
    setNextTag(selectedUser);
    setUserSelected(true);
  };

  useEffect(() => {
    dispatch(fetchUserFeatures());
    dispatch(getUserHistory());
  }, [dispatch]);

  // Check if the user can create unlimited posts
  useEffect(() => {
    // No features, default to true
    if (!features || features.length === 0) {
      setCanCreateUnlimitedPosts(true);
    } else {
      // Check if 'UNLIMITED_POSTS' feature exists and is unlocked
      const hasUnlimitedPostsFeature = features.some(
        (feature) =>
          feature.feature_name === 'UNLIMITED_POSTS' && feature.is_unlocked
      );

      //If the feature exists and is unlocked, set to true; if not found, default to true
      setCanCreateUnlimitedPosts(
        hasUnlimitedPostsFeature ||
          !features.some(
            (feature) => feature.feature_name === 'UNLIMITED_POSTS'
          )
      );
    }
  }, [features]);

  // Check time since the last post
  useEffect(() => {
    if (canCreateUnlimitedPosts) {
      return;
    }

    if (lastPost) {
      const lastPostDate = new Date(lastPost);
      // Calculate the time difference between now and the last post
      const currentTime = new Date();
      const timeDifference = currentTime - lastPostDate;
      // Check if cooldown is active
      const isCooldownActive = timeDifference < POST_COOLDOWN_TIME;
      setCooldownActive(isCooldownActive);

      if (isCooldownActive) {
        // Calculate the next time a post can be created
        const cooldownEndDate = new Date(
          lastPostDate.getTime() + POST_COOLDOWN_TIME
        );

        // Format the time
        const formattedTime = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(cooldownEndDate));

        setNewPostAvailableAt(formattedTime);
      }
    }
  }, [lastPost]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
    if (success) {
      toast.success(t('post_create_success'));
      dispatch({ type: NEW_POST_RESET });
      onCloseModal();
    }
  }, [dispatch, error, success, navigate]);

  return (
    <Dialog open={newPost} onClose={() => onCloseModal()} maxWidth='xl'>
      {!tagPage && (
        <div className='flex flex-col sm:w-screen max-w-4xl'>
          <div className='bg-white py-3 border-b px-4 flex justify-between w-full'>
            <span className='font-medium'>{t('new_post_title')}</span>
            {cooldownActive ? (
              <div className='text-red-500 text-sm'>
                <span>
                  {t('new_post_available_at', { time: newPostAvailableAt })}
                  <ShopButton />
                </span>
              </div>
            ) : null}
            <button
              onClick={nextPageHandler}
              disabled={loading || cooldownActive}
              className={`font-medium ${
                cooldownActive
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-blue-500 hover:underline'
              }`}
            >
              {t('next')}
            </button>
          </div>
          {loading && <LinearProgress />}

          <div className='flex sm:flex-row sm:items-start items-center flex-col w-full'>
            {postImage ? (
              <div className='bg-black h-48 sm:h-[80vh] w-full'>
                <img
                  draggable='false'
                  className='object-contain h-full w-full'
                  src={postPreview}
                  alt='post'
                />
              </div>
            ) : (
              <div
                onDragEnter={handleDragChange}
                onDragLeave={handleDragChange}
                className={`${dragged && 'opacity-40'} relative bg-white h-36 sm:h-[80vh] w-full flex flex-col gap-2 items-center justify-center mx-16`}
              >
                <svg
                  aria-label='Icon to represent media such as images or videos'
                  color='#262626'
                  fill='#262626'
                  height='77'
                  role='img'
                  viewBox='0 0 97.6 77.3'
                  width='96'
                >
                  <path
                    d='M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm-2.4-7.2c.5-.6 1.3-1 2.1-1h.2c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-.8.3-1.5.8-2.1z'
                    fill='currentColor'
                  ></path>
                  <path
                    d='M84.7 18.4L58 16.9l-.2-3c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.3-9.8 11L5 51v.8c.7 5.2 5.1 9.1 10.3 9.1h.6l21.7-1.2v.6c-.3 5.7 4 10.7 9.8 11l34 2h.6c5.5 0 10.1-4.3 10.4-9.8l2-34c.4-5.8-4-10.7-9.7-11.1zM7.2 10.8C8.7 9.1 10.8 8.1 13 8l34-1.9c4.6-.3 8.6 3.3 8.9 7.9l.2 2.8-5.3-.3c-5.7-.3-10.7 4-11 9.8l-.6 9.5-9.5 10.7c-.2.3-.6.4-1 .5-.4 0-.7-.1-1-.4l-7.8-7c-1.4-1.3-3.5-1.1-4.8.3L7 49 5.2 17c-.2-2.3.6-4.5 2-6.2zm8.7 48c-4.3.2-8.1-2.8-8.8-7.1l9.4-10.5c.2-.3.6-.4 1-.5.4 0 .7.1 1 .4l7.8 7c.7.6 1.6.9 2.5.9.9 0 1.7-.5 2.3-1.1l7.8-8.8-1.1 18.6-21.9 1.1zm76.5-29.5l-2 34c-.3 4.6-4.3 8.2-8.9 7.9l-34-2c-4.6-.3-8.2-4.3-7.9-8.9l2-34c.3-4.4 3.9-7.9 8.4-7.9h.5l34 2c4.7.3 8.2 4.3 7.9 8.9z'
                    fill='currentColor'
                  ></path>
                  <path
                    d='M78.2 41.6L61.3 30.5c-2.1-1.4-4.9-.8-6.2 1.3-.4.7-.7 1.4-.7 2.2l-1.2 20.1c-.1 2.5 1.7 4.6 4.2 4.8h.3c.7 0 1.4-.2 2-.5l18-9c2.2-1.1 3.1-3.8 2-6-.4-.7-.9-1.3-1.5-1.8zm-1.4 6l-18 9c-.4.2-.8.3-1.3.3-.4 0-.9-.2-1.2-.4-.7-.5-1.2-1.3-1.1-2.2l1.2-20.1c.1-.9.6-1.7 1.4-2.1.8-.4 1.7-.3 2.5.1L77 43.3c1.2.8 1.5 2.3.7 3.4-.2.4-.5.7-.9.9z'
                    fill='currentColor'
                  ></path>
                </svg>
                <p className='text-xl'>{t('drag_photo_title')}</p>
                <input
                  type='file'
                  accept='image/jpeg, image/jpg'
                  onChange={handleFileChange}
                  className='absolute h-full w-full opacity-0'
                />
              </div>
            )}

            <div className='flex flex-col border-l sm:h-[80vh] w-full bg-white'>
              <div className='flex gap-3 px-3 py-2 items-center'>
                <img
                  draggable='false'
                  className='w-11 h-11 rounded-full object-cover'
                  src={
                    user.profile?.picture
                      ? `data:image/jpeg;base64,${user.profile.picture}`
                      : empty_profile
                  }
                  alt='avatar'
                />
                <span className='text-black text-sm font-semibold'>
                  {user.username}
                </span>
              </div>

              <div className='p-3 w-full border-b relative'>
                <textarea
                  className='outline-none resize-none h-32 sm:h-auto'
                  placeholder={t('caption_holder')}
                  name='caption'
                  cols='40'
                  rows='12'
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onClick={() => setShowEmojis(false)}
                ></textarea>

                <div className='relative flex items-center justify-between'>
                  <BrowserView>
                    <span
                      onClick={() => setShowEmojis(!showEmojis)}
                      className='cursor-pointer'
                    >
                      {emojiIcon}
                    </span>

                    {showEmojis && (
                      <div className='absolute bottom-[-24rem] left-10'>
                        <Picker
                          set='google'
                          onSelect={handleNewEmoji}
                          title='Emojis'
                        />
                      </div>
                    )}
                  </BrowserView>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tagPage && (
        <div className='flex flex-col sm:w-screen max-w-4xl'>
          <div className='bg-white py-3 border-b px-4 flex justify-between w-full'>
            <span className='font-medium'>{t('tag_users')}</span>
            <button
              onClick={newPostSubmitHandler}
              disabled={loading}
              className='text-blue-500 font-medium'
            >
              {t('share')}
            </button>
          </div>
          <div className='flex sm:flex-row sm:items-start items-center flex-col w-full'>
            <div
              className='flex items-center justify-center relative w-full h-[80vh]'
              style={{ backgroundColor: 'black' }}
            >
              <img
                ref={imageRef}
                draggable='false'
                src={postPreview}
                alt='post'
                onClick={handleImageClick}
                style={{
                  objectFit: 'contain',
                  position: 'absolute',
                }}
              />
              {imageRef.current &&
                imageTags.map((tag, index) => {
                  const imgRect = imageRef.current.getBoundingClientRect();
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        left: `${tag.x * imgRect.width - 10}px`,
                        top: `${tag.y * imgRect.height + imageRef.current.offsetTop - 10}px`,
                        maxWidth: `${actualImageWidth - tag.x * actualImageWidth}px`,
                      }}
                      className='rounded-full bg-black text-white px-2 py-1 relative inline-flex text-xs'
                    >
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {tag.username}
                      </span>
                      <span className='ml-2'>
                        <button
                          onClick={() => {
                            let updatedTags = imageTags.filter(
                              (_, runningIndex) => runningIndex !== index
                            );
                            setImageTags(updatedTags);
                          }}
                          className='text-white text-xs'
                        >
                          X
                        </button>
                      </span>
                    </div>
                  );
                })}
            </div>
            <div className='flex flex-col pt-1 pl-5 pb-2 border-l sm:h-[80vh] w-full bg-white'>
              <UserSearch onUserSelect={handleUserSelected} />
              {userSelected ? (
                <>
                  <SearchUserItem className {...nextTag} />
                  <span className='pl-3'> {t('tag_explainer')}</span>{' '}
                </>
              ) : (
                <span className='pt-3 pl-2'>{t('tag_helper')}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default NewPost;
