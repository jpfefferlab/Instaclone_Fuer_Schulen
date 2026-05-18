import React from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import empty_profile from '../../../assets/images/empty_profile.png';

const ActionUserItem = ({ action_type, created_on, post, creator }) => {
  const { t } = useTranslation();
  const actionTypeText = {
    comment: t('action_comment'), following: t('action_following'), like: t('action_like'),
  };

  return (<Link
      to={`/${creator.username}`}
      className='flex items-center hover:bg-gray-50 py-2 px-4 cursor-pointer'
    >
      <div className='w-full border-b pb-2 mt-2 flex justify-between items-center'>
        <div className='flex items-center space-x-3'>
          <img
            className='w-10 h-10 rounded-full object-cover flex-shrink-0'
            src={creator.profile?.picture ? `data:image/jpeg;base64,${creator.profile.picture}` : empty_profile}
            alt='avatar'
          />
          <span className='text-black text-sm font-semibold'>
        {creator.username}{' '}
            <span className='text-gray-600 text-sm'>
          {`${actionTypeText[action_type]} `}
              <span className='text-gray-400 text-sm'>
            {moment(created_on).fromNow()}
          </span>
        </span>
      </span>
        </div>
        {action_type !== 'following' && (
          <img
            className='w-11 h-11 object-cover'
            src={`data:image/jpeg;base64,${post.content_preview}`}
            alt='imagePreview'
          />
        )}
      </div>
    </Link>
  );
};

export default ActionUserItem;
