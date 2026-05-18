//import axios from "axios";
import axios from '../Routes/axios';
import {
  ACTION_FAIL,
  ACTION_REQUEST,
  ACTION_SUCCESS,
  ALL_POSTS_FAIL,
  ALL_POSTS_REQUEST,
  ALL_POSTS_SUCCESS,
  CLEAR_ERRORS,
  DELETE_COMMENT_FAIL,
  DELETE_COMMENT_SUCCESS,
  DELETE_POST_FAIL,
  DELETE_POST_REQUEST,
  DELETE_POST_SUCCESS,
  DELETE_TAG_FAIL,
  DELETE_TAG_REQUEST,
  DELETE_TAG_SUCCESS,
  EDIT_POST_FAIL,
  EDIT_POST_REQUEST,
  EDIT_POST_SUCCESS,
  GET_LIKES_FAIL,
  GET_LIKES_SUCCESS,
  LIKE_UNLIKE_POST_FAIL,
  LIKE_UNLIKE_POST_REQUEST,
  LIKE_UNLIKE_POST_SUCCESS,
  NEW_ADVERTISEMENT_FAIL,
  NEW_ADVERTISEMENT_REQUEST,
  NEW_ADVERTISEMENT_SUCCESS,
  NEW_COMMENT_FAIL,
  NEW_COMMENT_REQUEST,
  NEW_COMMENT_SUCCESS,
  NEW_POST_FAIL,
  NEW_POST_REQUEST,
  NEW_POST_SUCCESS,
  NEWSFEED_FAIL,
  NEWSFEED_REQUEST,
  NEWSFEED_SUCCESS,
} from '../constants/postConstants';
import { toast } from 'react-toastify';
import { t } from 'i18next';
import { getCookie } from '../utils/cookieUtil';

const csrftoken = getCookie('csrftoken');

axios.defaults.headers.common['X-CSRFToken'] = csrftoken;

// New Post
export const addNewPost = (postData) => async (dispatch) => {
  try {
    dispatch({ type: NEW_POST_REQUEST });
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const { data } = await axios.post('/api/posts/', postData, config);
    dispatch({
      type: NEW_POST_SUCCESS, payload: { post: data, success: true },
    });

    return data;
  } catch (error) {
    dispatch({
      type: NEW_POST_FAIL, payload: error.response.data.message,
    });
  }
};

export const addNewAdvertisement = (advertisementData) => async (dispatch) => {
  try {
    dispatch({ type: NEW_ADVERTISEMENT_REQUEST });
    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const { data } = await axios.post('/api/advertisements/', advertisementData, config);
    dispatch({ type: NEW_ADVERTISEMENT_SUCCESS, payload: data });
    toast.success(t('ad_saved'));
  } catch (error) {
    dispatch({ type: NEW_ADVERTISEMENT_FAIL });
    toast.error(error);
  }
};

// Get Post of Followings
export const getNewsfeed = (page = 1) => async (dispatch) => {
  try {
    dispatch({ type: NEWSFEED_REQUEST });
    const { data } = await axios.get('/api/feed/', { params: { page } });
    dispatch({
      type: NEWSFEED_SUCCESS, payload: {
        posts: data.results, totalPosts: data.count, nextPageUrl: data.next,
      },
    });
  } catch (error) {
    dispatch({
      type: NEWSFEED_FAIL, payload: error.response.data.message,
    });
  }
};

// gets all Posts from one user
export const getAllPosts = (user_id, type, page = 1) => async (dispatch) => {
  try {
    dispatch({ type: ALL_POSTS_REQUEST });
    const { data } = await axios.get(`/api/${type}/`, { params: { page, user_id } });
    dispatch({
      type: ALL_POSTS_SUCCESS, payload: {
        posts: data.results, totalPosts: data.count, nextPageUrl: data.next, user_id: user_id,
      },
    });
  } catch (error) {
    dispatch({
      type: ALL_POSTS_FAIL, payload: error.response.data.message,
    });
  }
};

export const getLikes = (postID) => async (dispatch) => {
  try {
    const { data } = await axios.get(`/api/likes/`, { params: { post_id: postID } });
    dispatch({ type: GET_LIKES_SUCCESS, payload: data });
  } catch (error) {
    dispatch({ type: GET_LIKES_FAIL, payload: error.response.data.message });
  }
};

// Like | Unlike Post
export const likePost = (postID) => async (dispatch) => {
  try {
    dispatch({ type: LIKE_UNLIKE_POST_REQUEST });
    const { data } = await axios.post('/api/likes/', { post: postID });
    dispatch({
      type: LIKE_UNLIKE_POST_SUCCESS, payload: { postID: postID, data: data, likeType: true },
    });
  } catch (error) {
    dispatch({
      type: LIKE_UNLIKE_POST_FAIL, payload: error.response.data.message,
    });
  }
};

export const unlikePost = (likeID, postID) => async (dispatch) => {
  try {
    dispatch({ type: LIKE_UNLIKE_POST_REQUEST });
    const config = { header: { 'Content-Type': 'application/json' } };
    await axios.delete(`/api/likes/${likeID}/`, config);
    dispatch({
      type: LIKE_UNLIKE_POST_SUCCESS, payload: { postID: postID, likeID: likeID, likeType: false },
    });
  } catch (error) {
    dispatch({
      type: LIKE_UNLIKE_POST_FAIL, payload: error.response.data.message,
    });
  }
};

// Add Comment
export const addComment = (postId, comment) => async (dispatch) => {
  try {
    dispatch({ type: NEW_COMMENT_REQUEST });
    const config = { header: { 'Content-Type': 'application/json' } };
    const { data } = await axios.post(`/api/comments/`, { content: comment, post: postId }, config);
    dispatch({
      type: NEW_COMMENT_SUCCESS, payload: data,
    });
  } catch (error) {
    dispatch({
      type: NEW_COMMENT_FAIL, payload: error.response.data.message,
    });
  }
};

// Delete Post
export const deletePost = (postId) => async (dispatch) => {
  try {
    dispatch({ type: DELETE_POST_REQUEST });
    const response = await axios.delete(`/api/posts/${postId}/`);
    dispatch({
      type: DELETE_POST_SUCCESS, payload: { status: response.status, postId },
    });
  } catch (error) {
    dispatch({
      type: DELETE_POST_FAIL, payload: error.response.data.message,
    });
  }
};

// Delete Own Tag
export const deleteTag = (postID, tagID) => async (dispatch) => {
  try {
    dispatch({ type: DELETE_TAG_REQUEST });
    const response = await axios.delete(`/api/image-tags/${tagID}`);
    dispatch({
      type: DELETE_TAG_SUCCESS, payload: { status: response.status, postID, tagID },
    });
  } catch (error) {
    dispatch({
      type: DELETE_TAG_FAIL, payload: error.response.data.message,
    });
  }
};


// Get Actions that are displayed in the header bar
export const getActions = (page = 1) => async (dispatch) => {
  try {
    dispatch({ type: ACTION_REQUEST });
    const { data } = await axios.get('/api/actions/', { params: { page } });
    dispatch({
      type: ACTION_SUCCESS, payload: {
        actions: data.results, totalActions: data.count, nextPageUrl: data.next,
      },
    });
  } catch (error) {
    dispatch({
      type: ACTION_FAIL, payload: error.response.data.message,
    });
  }
};

export const deleteComment = (postID, commentID) => async (dispatch) => {
  try {
    await axios.delete(`/api/comments/${commentID}/`);
    dispatch({
      type: DELETE_COMMENT_SUCCESS, payload: { postID, commentID },
    });
  } catch (error) {
    dispatch({
      type: DELETE_COMMENT_FAIL, payload: error.response.data.message,
    });
  }
};

export const editPost = (postID, postData) => async (dispatch) => {
  try {
    dispatch({ type: EDIT_POST_REQUEST });
    const config = { headers: { 'Content-Type': 'application/json' } };
    const { data } = await axios.patch(`/api/posts/${postID}/`, postData, config);
    dispatch({
      type: EDIT_POST_SUCCESS, payload: data,
    });
  } catch (error) {
    dispatch({
      type: EDIT_POST_FAIL, payload: error.response.data.message,
    });
  }
};


// Clear All Errors
export const clearErrors = () => (dispatch) => {
  dispatch({ type: CLEAR_ERRORS });
};
