import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import { MoreHoriz } from '@mui/icons-material';
import { useState } from 'react';
import moment from 'moment';
import { deleteComment } from '../../../actions/postAction';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@mui/material';
import empty_profile from '../../../assets/images/empty_profile.png';
import CreatedOn from "./CreatedOn";


const CommentDisplay = ({ id, comments, creator, created_on, usage }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.user);
  const [viewComment, setViewComment] = useState(false);
  const [commentOptionModal, setCommentOptionModal] = useState(false);

  const closeCommentOptionModal = () => {
    setCommentOptionModal(false);
  };

  const handleDeleteComment = async (c_id) => {
    await dispatch(deleteComment(id, c_id));
    if (comments.length === 0) {
      setViewComment(false);
    }
    setCommentOptionModal(false);
  };

  return (<>
    {usage === 'feed' && (
      <div>
        {comments.length > 0 ? (
          <div>
        <span
          onClick={() => setViewComment(!viewComment)}
          className='text-[13px] text-gray-500 cursor-pointer'
        >
          {viewComment ? t('hide_comment') : comments.length === 1 ? `${t('view_comment')}` : `${t('view_comments', { count: comments.length })}`}
        </span>
          </div>
        ) : (
          <div>
            <span className='text-[13px] text-gray-500'>{t('no_comments')}</span>
          </div>
        )}
        <div>
        <CreatedOn created_on={created_on}></CreatedOn>
        </div>
      </div>
    )}

    {(viewComment || usage === 'profile') && comments?.map((c) => (
      <div className='flex items-start mb-3 pt-2' key={c.id}>
        <img
          draggable='false'
          className='rounded-full object-cover mr-2.5'
          style={{ width: '28px', height: '28px', flexShrink: 0 }}
          src={c.creator.profile?.picture ? `data:image/jpeg;base64,${c.creator.profile.picture}` : empty_profile}
          alt='avatar'
        />
        <div className='flex flex-col items-start'>
          <div>
            <Link
              to={`/${c.creator.username}`}
              className='text-sm font-semibold hover:underline'
            >
              {c.creator.username}
            </Link>
            <span className='text-sm whitespace-pre-line' style={{ overflowWrap: 'break-word' }}> {c.content}</span>
          </div>
          <div>
            <span className='text-gray-400 text-xs'>{moment(c.created_on).fromNow()}</span>
            {(creator.id === user.id || user.report_view || c.creator.id === user.id) && (<IconButton
              aria-label='Delete comment'
              color='default'
              size='small'
              disableRipple={true}
              onClick={() => setCommentOptionModal(true)}
            ><MoreHoriz /></IconButton>)}
          </div>
        </div>
        <Dialog open={commentOptionModal} onClose={closeCommentOptionModal} maxWidth='xl'
                backgroundcolor='transparent'>
          <div className='flex flex-col items-center w-80'>
            {(creator.id === user.id || user.report_view || c.creator.id === user.id) && (<button
              onClick={() => handleDeleteComment(c.id)}
              className='text-red-600 font-medium border-b py-2.5 w-full hover:bg-red-50'
            >
              {t('delete')}
            </button>)}
            <button
              onClick={closeCommentOptionModal}
              className='py-2.5 w-full hover:bg-gray-50'
            >
              {t('cancel')}
            </button>
          </div>
        </Dialog>
      </div>))}
  </>);
};

export default CommentDisplay;
