import axios from '../Routes/axios';
import {
  GET_STORIES_FAIL,
  GET_STORIES_REQUEST,
  GET_STORIES_SUCCESS,
  NEW_STORY_FAIL,
  NEW_STORY_REQUEST,
  NEW_STORY_SUCCESS,
  STORY_VIEW_FAIL,
  STORY_VIEW_SUCCESS,
} from '../constants/storyConstants';

export const getStories = (user_id) => async (dispatch) => {
  try {
    dispatch({ type: GET_STORIES_REQUEST });
    const { data: data_story } = await axios.get('/api/stories/');
    const { data: data_view } = await axios.get('/api/story-views/', { params: { user_id } });
    dispatch({
      type: GET_STORIES_SUCCESS, payload: { stories: data_story, views: data_view },
    });
  } catch (error) {
    dispatch({
      type: GET_STORIES_FAIL, payload: error.response.data.message,
    });
  }
};

export const addNewStory = (postData) => async (dispatch) => {
  try {
    dispatch({ type: NEW_STORY_REQUEST });
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const { data } = await axios.post('/api/stories/', postData, config);
    dispatch({
      type: NEW_STORY_SUCCESS, payload: { post: data, success: true },
    });
    dispatch(getStories());
  } catch (error) {
    dispatch({
      type: NEW_STORY_FAIL, payload: error.response.data.message,
    });
  }
};

export const trackStoryView = (user_id, story_id) => async (dispatch) => {
  try {
    const { data } = await axios.post('/api/story-views/', { story_id: story_id, user_id: user_id });
    dispatch({
      type: STORY_VIEW_SUCCESS, payload: { view: data, success: true },
    });
  } catch (error) {
    dispatch({
      type: STORY_VIEW_FAIL, payload: error.response.data.message,
    });
  }
};
