//import { applyMiddleware, combineReducers, createStore } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  allUsersReducer,
  followUserReducer,
  forgotPasswordReducer,
  profileReducer,
  settingsReducer,
  historyReducer,
  userDetailsReducer,
  userReducer,
} from './reducers/userReducer';
import {
  actionsReducer,
  allPostsReducer,
  deleteCommentReducer,
  deletePostReducer,
  deleteTagReducer,
  editPostReducer,
  likePostReducer,
  newAdvertisementReducer,
  newCommentReducer,
  newPostReducer,
  newsfeedReducer,
  savePostReducer,
} from './reducers/postReducer';
import {
  getStoryReducer,
  newStoryReducer,
  storyViewReducer,
} from './reducers/storyReducer';
import { analyticsReducer } from './reducers/analyticsReducer';
import {
  moderationReducer,
  reportPostReducer,
  restrictUserReducer,
} from './reducers/moderationReducer';
import {
  workbookSectionsReducer,
  userPointsReducer,
  userFeatureReducer,
} from './reducers/workbookReducer';

const reducer = {
  user: userReducer,
  forgotPassword: forgotPasswordReducer,
  newPost: newPostReducer,
  newAdvertisement: newAdvertisementReducer,
  newStory: newStoryReducer,
  userDetails: userDetailsReducer,
  allUsers: allUsersReducer,
  newsfeed: newsfeedReducer,
  likePost: likePostReducer,
  followUser: followUserReducer,
  newComment: newCommentReducer,
  savePost: savePostReducer,
  deletePost: deletePostReducer,
  profile: profileReducer,
  settings: settingsReducer,
  history: historyReducer,
  allPosts: allPostsReducer,
  getStories: getStoryReducer,
  storyView: storyViewReducer,
  analytics: analyticsReducer,
  deleteTag: deleteTagReducer,
  actions: actionsReducer,
  postReports: reportPostReducer,
  moderation: moderationReducer,
  restrictUser: restrictUserReducer,
  deleteComment: deleteCommentReducer,
  editPost: editPostReducer,
  workbookSections: workbookSectionsReducer,
  userPoints: userPointsReducer,
  userFeatures: userFeatureReducer,
};

// Configure the Redux store with reducers and middleware
const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
  devTools: true, // Enable Redux DevTools
});

export default store;
