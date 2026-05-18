import React from 'react';
import { Box, Divider, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import BlockIcon from '@mui/icons-material/Block';
import NoAccountsIcon from '@mui/icons-material/NoAccounts';
import moment from 'moment';
import { deletePost } from '../../actions/postAction';
import { useDispatch } from 'react-redux';
import { ignoreReport, restrictUser } from '../../actions/moderationActions';
import Tooltip from '@mui/material/Tooltip';
import { getImageSource } from '../../utils/imageUtils';

const PostReportItem = ({ post, reporter, id, created_on }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const handleDeletePost = async () => {
    await dispatch(deletePost(post.id));
  };

  const handleIgnoreReport = async () => {
    await dispatch(ignoreReport(id));
  };

  const handleRestrictUser = async () => {
    await dispatch(restrictUser(post.creator.id));
  };

  return (
    <Stack
      my={1}
      direction='row'
      divider={<Divider orientation='vertical' flexItem />}
      spacing={3}
    >
      {/* Image of reported Post*/}
      <Box
        sx={{
          position: 'relative',
          width: '400px',
          height: '400px',
        }}
      >
        <div
          style={{
            background: 'black',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            draggable='false'
            loading='lazy'
            className='h-full w-full object-contain max-h-100 max-w-100'
            src={getImageSource(post.content)}
            alt='Post'
          />
        </div>
      </Box>

      {/*Display of report information*/}
      <Box
        sx={{
          padding: '16px',
          width: '580px',
          height: '400px',
        }}
      >
        <div className='flex flex-col'>
          <span className='font-semibold'>{t('caption')}</span>{' '}
          <span>{post.caption}</span>
        </div>
        <div>
          <span className='font-semibold'>{t('creator')} </span>
          <Link to={`/${post.creator.username}`} style={{ color: '#1976d2' }}>
            {post.creator.username}
          </Link>
        </div>
        <div>
          <span className='font-semibold'>{t('creator_name')} </span>{' '}
          {post.creator.first_name} {post.creator.last_name}
        </div>
        <div>
          <span className='font-semibold'>{t('reporter')} </span>
          <Link to={`/${reporter.username}`} style={{ color: '#1976d2' }}>
            {' '}
            {reporter.username}
          </Link>
        </div>
        <div>
          <span className='font-semibold'>{t('reported_on')} </span>{' '}
          {moment(created_on).format('HH:mm DD.MM.YYYY')}
        </div>
      </Box>

      {/* Buttons for actions on report*/}
      <Box sx={{}}>
        <div className='flex flex-col my-2 gap-2'>
          <div className='flex gap-3 items-center'>
            <Tooltip
              title={
                <span className='text-sm'>{t('delete_post_tooltip')} </span>
              }
            >
              <IconButton
                aria-label='Delete Post'
                color='default'
                size='small'
                onClick={handleDeletePost}
                style={{ border: '1px solid grey' }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <span>{t('delete_post_explainer')}</span>
          </div>
          <div className='flex gap-3 items-center'>
            <Tooltip
              title={
                <span className='text-sm'>{t('ignore_report_tooltip')} </span>
              }
            >
              <IconButton
                aria-label='Ignore Report'
                color='default'
                size='small'
                onClick={handleIgnoreReport}
                style={{ border: '1px solid grey' }}
              >
                <BlockIcon style={{ color: 'red' }} />
              </IconButton>
            </Tooltip>
            <span>{t('ignore_report_explainer')}</span>
          </div>
          <div className='flex gap-3 items-center'>
            <Tooltip
              title={
                <span className='text-sm'>{t('user_restrict_tooltip')} </span>
              }
            >
              <IconButton
                aria-label='Ignore Report'
                color='default'
                size='small'
                onClick={handleRestrictUser}
                style={{ border: '1px solid grey' }}
              >
                <NoAccountsIcon />
              </IconButton>
            </Tooltip>
            <span>{t('user_restrict_explainer')}</span>
          </div>
        </div>
      </Box>
    </Stack>
  );
};

export default PostReportItem;
