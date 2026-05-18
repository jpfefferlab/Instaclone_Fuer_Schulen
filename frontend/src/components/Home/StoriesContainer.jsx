import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { getStories } from '../../actions/storyAction';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import StoryItem from './StoryItem';
import moment from 'moment';
import NewStory from '../Posts/NewStory';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import empty_profile from '../../assets/images/empty_profile.png';
import { getImageSource } from '../../utils/imageUtils';

const StoriesContainer = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { stories, views } = useSelector((state) => state.getStories);
  const { user } = useSelector((state) => state.user);
  const [viewModal, setViewModal] = useState(false);
  const [newStory, setNewStory] = useState(false);
  const [selectedStory, setSelectedStory] = useState();
  const handleClose = () => {
    setViewModal(false);
  };
  let other_stories = {};
  let my_stories = {};

  const handleStoryModal = (username) => {
    if (username === user.username) {
      setSelectedStory(my_stories[username]);
    } else {
      setSelectedStory(other_stories[username]);
    }
    setViewModal(true);
  };

  const error = null;
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
    dispatch(getStories(user.id));
  }, [dispatch, error, selectedStory, viewModal]);

  const settings = {
    dots: false, infinite: false, speed: 500, slidesToShow: 7.5, slidesToScroll: 3, centerMode: false, responsive: [{
      breakpoint: 1050, settings: {
        slidesToShow: 5, slidesToScroll: 3,
      },
    }, {
      breakpoint: 400, settings: {
        slidesToShow: 4, slidesToScroll: 2,
      },
    }],
  };

  if (stories !== undefined) {
    for (let i = 0; i < stories.length; i++) {
      const empty_story = {
        url: null, header: { heading: null, subheading: null, profileImage: null, id: -1 },
      };
      const id = stories[i].id;
      empty_story.viewed = !!views.find(view => view.story_id === id);
      empty_story.url = getImageSource(stories[i].content);
      empty_story.header.heading = stories[i].creator.username;
      empty_story.header.subheading = moment(stories[i].created_on).fromNow();
      empty_story.header.id = id;
      if (stories[i].creator.profile) {
        empty_story.header.profileImage = stories[i].creator.profile.picture ? `data:image/jpeg;base64,${stories[i].creator.profile.picture}` : empty_profile;
      }
      if (stories[i].creator.username === user.username) {
        if (my_stories[stories[i].creator.username]) {
          my_stories[stories[i].creator.username].push(empty_story);
        } else {
          my_stories[stories[i].creator.username] = [empty_story];
        }
      } else {
        if (other_stories[stories[i].creator.username]) {
          other_stories[stories[i].creator.username].push(empty_story);
        } else {
          other_stories[stories[i].creator.username] = [empty_story];
        }
      }
    }
  }

  return (<>
    {Object.keys(my_stories).length || Object.keys(other_stories).length ? (<Slider
      {...settings}
      className='flex-wrap w-full bg-white pt-2.5 pb-1 px-2.5 flex border rounded'
    >
      {Object.keys(my_stories).length ? (
        <div className='flex flex-col items-center p-2 cursor-pointer' style={{ margin: '0 10px' }}>
          <div className='flex flex-col align-items-center' style={{ width: '64px' }}>
            <div
              className={`p-[1px] rounded-full border-2 ${Object.values(my_stories)[0].every((story) => story.viewed) ? 'border-green-500' : 'border-red-500'}`}
              style={{ width: '64px', height: '64px', overflow: 'hidden' }}
            >
              <img
                onClick={() => handleStoryModal(user.username)}
                loading='lazy'
                className='rounded-full h-full w-full border border-gray-300 object-cover'
                src={user.profile?.picture ? `data:image/jpeg;base64,${user.profile.picture}` : empty_profile}
                draggable='false'
                alt='story'
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <span
              className='text-xs mt-2'
              style={{
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                textAlign: 'center',
              }}
            >
              {user.username}
        </span></div>
        </div>) : ('')}

      {Object.entries(other_stories).map(([username, stories]) => (<div
        key={username} className='flex flex-col items-center p-2 cursor-pointer' style={{ margin: '0 10px' }}
      >
        <div className='flex flex-col align-items-center' style={{ width: '64px' }}>
          <div
            className={`p-[1px] rounded-full border-2 ${stories.every((story) => story.viewed) ? 'border-green-500' : 'border-red-500'}`}
            style={{ width: '64px', height: '64px', overflow: 'hidden' }}
          >
            <img
              onClick={() => handleStoryModal(username)}
              loading='lazy'
              className='rounded-full border border-gray-300 object-cover'
              src={stories[0].header.profileImage}
              draggable='false'
              alt='mini_story'
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

          </div>
          <span
            className='text-xs mt-2'
            style={{
              display: 'block',
              width: '100%',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              textAlign: 'center',
            }}
          >
          {username}
        </span>
        </div>
      </div>))}
    </Slider>) : (<div
      className='text-center justify-center w-full bg-white pt-2.5 pb-1 px-2.5 flex overflow-hidden border rounded'>
      <Button
        className='flex items-center gap-3 p-2.5 text-sm pl-4 cursor-pointer hover:bg-gray-50'
        onClick={() => setNewStory(true)}
      >
        {t('first_story_banner')}
      </Button>
    </div>)}
    <StoryItem
      stories={selectedStory}
      open={viewModal}
      onClose={handleClose}
      u_id={user.id}
    />

    <NewStory newPost={newStory} setNewPost={setNewStory} />
  </>);

};

export default StoriesContainer;
