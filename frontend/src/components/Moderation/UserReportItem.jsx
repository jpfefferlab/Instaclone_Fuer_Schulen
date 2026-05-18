import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { unrestrictUser } from '../../actions/moderationActions';
import { Box, Divider, Stack } from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';
import RemoveIcon from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import empty_profile from '../../assets/images/empty_profile.png';

const UserReportItem = (user) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const handleRemoveRestriction = async () => {
    await dispatch(unrestrictUser(user.id));
  };
  return (<Stack
      my={1}
      direction='row'
      divider={<Divider orientation='vertical' />}
      spacing={6}
      alignItems={'center'}
    > <Box className='flex flex-row items-center gap-3'>
      <img
        draggable='false'
        className='rounded-full object-cover w-20 h-20'
        src={user.profile?.picture ? `data:image/jpeg;base64,${user.profile.picture}` : empty_profile}
        alt='Post'
      />
      <Link
        to={`/${user.username}`}
        className='font-semibold hover:underline'
      >
        {user.username}
      </Link>
    </Box>
      <Box>
        <div className='flex flex-row items-start justify-center gap-8'>
          <div>
            <span className='mr-1.5 font-semibold'>{t('first_name')}</span>
            <span className='font-medium'>{user.first_name}</span>
          </div>
          <div>
            <span className='mr-1.5 font-semibold'>{t('last_name')}</span>
            <span className='font-medium'>{user.last_name}</span>
          </div>
        </div>
      </Box>
      <Box className='flex gap-3 items-center'>
        <Tooltip title={<span className='text-sm'>{t('remove_restriction_tooltip')} </span>}>
          <IconButton
            aria-label='Remove restriction'
            color='default'
            size='small'
            onClick={handleRemoveRestriction}
            style={{ border: '1px solid grey' }}>
            <RemoveIcon />
          </IconButton>
        </Tooltip>
        <span>{t('remove_restriction_explainer')}</span>
      </Box>
    </Stack>
  );
};

export default UserReportItem;
