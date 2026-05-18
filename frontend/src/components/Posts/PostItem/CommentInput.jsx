import { emojiIcon } from '../../Home/SvgIcons';
import { Picker } from 'emoji-mart';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addComment } from '../../../actions/postAction';
import { useDispatch } from 'react-redux';

const CommentInput = ({ id, commentInputRef }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [showEmojis, setShowEmojis] = useState(false);
  const [comment, setComment] = useState('');


  const handleComment = async (e) => {
    e.preventDefault();
    let commentHelper = comment;
    setComment('');
    await dispatch(addComment(id, commentHelper));
  };


  return (<form
    onSubmit={handleComment}
    className='flex items-center justify-between p-3 w-full space-x-3'
  >
        <span
          onClick={() => setShowEmojis(!showEmojis)}
          className='cursor-pointer'
        >
          {emojiIcon}
        </span>

    {showEmojis && (<div className='absolute bottom-12 -left-2'>
      <Picker
        set='google'
        onSelect={(e) => setComment(comment + e.native)}
        title='Emojis'
        emojiSize={28}
      />
    </div>)}

    <input
      className='flex-auto text-sm outline-none border-none bg-transparent'
      type='text'
      value={comment}
      ref={commentInputRef}
      required
      onFocus={() => setShowEmojis(false)}
      onChange={(e) => setComment(e.target.value)}
      placeholder={t('add_comment')}
    />
    <button
      type='submit'
      className={`${comment.trim().length < 1 ? 'text-blue-300' : 'text-primary-blue'} text-sm font-semibold`}
      disabled={comment.trim().length < 1}
    >
      {t('post_action')}
    </button>
  </form>);
};

export default CommentInput;
