import { deletePost, deleteTag } from '../../../actions/postAction';
import { useDispatch, useSelector } from 'react-redux';
import { Dialog, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from '../../../Routes/axios';
import { toast } from 'react-toastify';
import { useState } from 'react';


const OptionModal = ({ id, image_tags, creator, type, setOptionModal, optionModal, setEditPostModal }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const { user } = useSelector(state => state.user);
  const [lastReportTime, setLastReportTime] = useState(0);

  const closeOptionModal = () => {
    setOptionModal(false);
  };

  const handleDeletePost = () => {
    dispatch(deletePost(id));
    setOptionModal(false);
  };

  const handleDeleteTag = async () => {
    let tag_id = image_tags.find(entry => entry.username === user.username)['id'];
    dispatch(deleteTag(id, tag_id));
    setOptionModal(false);
  };

  const handleEditPost = () => {
    setEditPostModal(true);
    setOptionModal(false);
  };

  const handleReportPost = async () => {
    const currentTime = Date.now();
    if (currentTime - lastReportTime < 10000) {
      return;
    }
    setLastReportTime(currentTime);
    try {
      await axios.post(`/api/post-reports/`, { post_id: id, reporter_id: user.id });
      toast.success(t('report_post_success'));
    } catch (error) {
      if (error.response.status === 400) {
        toast.error(t('report_post_error_exists'));
      } else {
        toast.error(t('report_post_error_alternate'));
      }
    }
    setOptionModal(false);
  };


  return (
    <Dialog open={optionModal} onClose={closeOptionModal} maxWidth='xl'>
      <div className='flex flex-col items-center w-80'>
        {(creator.id === user.id || user.report_view) && (<button
          onClick={handleDeletePost}
          className='text-red-600 font-medium border-b py-2.5 w-full hover:bg-red-50'
        >
          {t('delete')}
        </button>)}
        {image_tags.some(entry => entry.username === user.username) && (
          <button onClick={handleDeleteTag}
                  className='text-red-600 font-medium border-b py-2.5 w-full hover:bg-red-50'>
            {t('delete_tag')}
          </button>)}
        {creator.id !== user.id && (
          <Tooltip title={<span className='text-sm'> {t('report_post_tooltip')}</span>}>
            <button
              onClick={handleReportPost}
              className='text-red-600 font-medium border-b py-2.5 w-full hover:bg-red-50'>
              {t('report')}
            </button>
          </Tooltip>)}
        {(creator.id === user.id && type !== 'ADVERTISEMENT') && (<button
          onClick={handleEditPost}
          className='font-medium border-b py-2.5 w-full hover:bg-gray-50'>
          {t('edit_post')}
        </button>)}
        <button
          onClick={closeOptionModal}
          className='py-2.5 w-full hover:bg-gray-50'
        >
          {t('cancel')}
        </button>
      </div>
    </Dialog>);
};

export default OptionModal;
