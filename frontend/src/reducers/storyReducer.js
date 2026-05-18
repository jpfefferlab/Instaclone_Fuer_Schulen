import {
  CLEAR_ERRORS,
  GET_STORIES_FAIL,
  GET_STORIES_REQUEST,
  GET_STORIES_RESET,
  GET_STORIES_SUCCESS,
  NEW_STORY_FAIL,
  NEW_STORY_REQUEST,
  NEW_STORY_RESET,
  NEW_STORY_SUCCESS,
  STORY_VIEW_FAIL,
  STORY_VIEW_SUCCESS,
} from '../constants/storyConstants';

export const getStoryReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case GET_STORIES_REQUEST:
      return {
        ...state, loading: true,
      };
    case GET_STORIES_SUCCESS:
      return {
        loading: false, stories: payload.stories, views: payload.views,
      };
    case GET_STORIES_FAIL:
      return {
        ...state, loading: false, error: payload,
      };
    case GET_STORIES_RESET:
      return {
        ...state, success: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const newStoryReducer = (state = { loading: false, post: null, success: undefined, error: null }, {
  type,
  payload,
}) => {
  switch (type) {
    case NEW_STORY_REQUEST:
      return {
        ...state, loading: true,
      };
    case NEW_STORY_SUCCESS:
      return {
        loading: false, success: payload.success, post: payload.post,
      };
    case NEW_STORY_FAIL:
      return {
        ...state, loading: false, error: 'Something wrong',
      };
    case NEW_STORY_RESET:
      return {
        ...state, success: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const storyViewReducer = (state = { view: null, success: undefined, error: null }, { type, payload }) => {
  switch (type) {
    case STORY_VIEW_SUCCESS:
      return {
        success: true, view: payload.view,
      };
    case STORY_VIEW_FAIL:
      return {
        success: false, view: null, error: payload,
      };
    default:
      return state;
  }
};
