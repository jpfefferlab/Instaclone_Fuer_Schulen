import React from 'react';
import { postUploadOutline, storyUploadOutline } from './SvgIcons';
import { ClickAwayListener } from '@mui/material';
import { useTranslation } from 'react-i18next';

const PostDetails = ({ setNewPost, setPostToggle, setNewStory }) => {
  const { t } = useTranslation();

  const tabs = [
    {
      title: t('new_post'),
      icon: postUploadOutline,
      onclick: 'post',
    },
    {
      title: t('new_story'),
      icon: storyUploadOutline,
      onclick: 'story',
    },
  ];

  const handleNewPost = (modaltype) => {
    if (modaltype === 'post') {
      setNewPost(true);
    } else {
      setNewStory(true);
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setPostToggle(false)}>
      <div className='absolute bg-white rounded md:w-52 drop-shadow top-12 border'>
        <div className='flex flex-col w-full overflow-hidden'>
          {tabs.map((el, i) => (
            <button
              onClick={() => handleNewPost(el.onclick)}
              className='flex items-center gap-3 p-2.5 text-sm pl-4 cursor-pointer hover:bg-gray-50'
              key={i}
            >
              {el.icon}
              {el.title}
            </button>
          ))}
        </div>
      </div>
    </ClickAwayListener>
  );
};

export default PostDetails;
