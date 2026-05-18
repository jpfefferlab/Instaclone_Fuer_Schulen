import { Dialog, LinearProgress } from '@mui/material';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { clearErrors } from '../../actions/postAction';
import { addNewStory } from '../../actions/storyAction';
import { NEW_POST_RESET } from '../../constants/postConstants';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { compressImage, toBase64 } from '../../utils/imageUtils';

const NewStory = ({ newPost, setNewPost }) => {
  const { t } = useTranslation();

  const dispatch = useDispatch();

  const { loading, error } = useSelector((state) => state.newStory);
  const [postImage, setPostImage] = useState('');
  const [postUpload, setPostUpload] = useState(null);
  const [postPreview, setPostPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [dragged, setDragged] = useState(false);

  const handleDragChange = () => {
    setDragged(!dragged);
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
      setPostImage(img.base64);
    }
  };

  const onCloseModal = () => {
    setNewPost(false);
    setPostImage('');
    setPostUpload(null);
    setCaption('');
    setPostPreview('');
  };

  const newPostSubmitHandler = async (e) => {
    try {
      e.preventDefault();
      if (!postImage) {
        toast.error('Select Image');
        return;
      }
      const formData = new FormData();
      const date = new Date();
      date.setDate(date.getDate() + 1);
      formData.set('content', postImage);
      if (postUpload) {
        formData.set('content_upload', postUpload, postUpload.name || 'story.jpg');
      }
      formData.set(
        'expiration_time',
        moment(date).format('YYYY-MM-DDTHH:mm:ss.000000Z'),
      );
      await dispatch(addNewStory(formData));
      if (!error) {
        toast.success(t('story_shared'));
      } else {
        toast.error(error);
      }
      dispatch({ type: NEW_POST_RESET });
      setNewPost(false);
      setPostImage('');
      setPostUpload(null);
      setPostPreview('');
      setCaption('');
    } catch (err) {
      toast.error(err);
      if (error) {
        toast.error(error);
        dispatch(clearErrors());
      }
    }
  };
  return (
    <Dialog open={newPost} onClose={() => onCloseModal()} maxWidth='sm'>
      <div className='flex flex-col sm:w-screen max-w-xl'>
        <div className='bg-white py-3 border-b px-4 flex justify-between w-full'>
          <span className='font-bold'>{t('new_story_title')}</span>
          <button
            onClick={newPostSubmitHandler}
            disabled={loading}
            className='text-blue-500 font-medium'
          >
            {t('share')}
          </button>
        </div>
        {loading && <LinearProgress />}

        <div className='flex sm:flex-row sm:items-start items-center flex-col w-full'>
          {postImage ? (
            <div className='bg-black  sm:h-[80vh] w-full'>
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
              className={`${
                dragged && 'opacity-40'
              } relative bg-white h-36 sm:h-[80vh] w-full flex flex-col gap-2 items-center justify-center mx-16`}
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
        </div>
      </div>
    </Dialog>
  );
};

export default NewStory;
