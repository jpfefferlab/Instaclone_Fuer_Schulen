import Stories from 'react-insta-stories';
import { Dialog, Slide } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { trackStoryView } from '../../actions/storyAction';

const Transition = React.forwardRef(function Transition(props, ref) {
  return (<Slide direction='down' mountOnEnter unmountOnExit ref={ref} {...props} />);
});

const StoryItem = ({ stories, open, onClose, u_id }) => {
  const dispatch = useDispatch();
  const { innerWidth: width, innerHeight: height } = window;
  const [isMobile, setIsMobile] = useState(false);

  const handleStoryEnd = (index) => {
    if (!index.viewed) {
      dispatch(trackStoryView(u_id, index.header.id)).then(index.viewed = true);
    }
  };


  const handleResize = () => {
    if (width < 720 || height < 720) {
      setIsMobile(true);
    } else {
      setIsMobile(false);
    }
  };

  useEffect(() => {
    handleResize();
  }, [width]);

  return (<>
    <Dialog
      TransitionComponent={Transition}
      disableScrollLock={!isMobile}
      fullScreen={isMobile}
      open={open}
      onClose={onClose}
    >
      <Stories
        onAllStoriesEnd={onClose}
        stories={stories}
        defaultInterval={2000}
        width={isMobile ? width : 432}
        height={isMobile ? height : 768}
        storyStyles={{
          width: 432, maxHeight: '100%',
        }}
        onStoryEnd={(storyId, storyIndex) => handleStoryEnd(storyIndex)}
      />
      <IconButton
        edge='start'
        color='inherit'
        onClick={onClose}
        aria-label='close'
      >
        <CloseIcon />
      </IconButton>
    </Dialog>
  </>);
};

export default StoryItem;
