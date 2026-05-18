import {
  ALL_USERS_FAIL,
  ALL_USERS_REQUEST,
  ALL_USERS_SUCCESS,
  CLEAR_ERRORS,
  FOLLOW_USER_FAIL,
  FOLLOW_USER_REQUEST,
  FOLLOW_USER_RESET,
  FOLLOW_USER_SUCCESS,
  FORGOT_PASSWORD_FAIL,
  FORGOT_PASSWORD_REQUEST,
  FORGOT_PASSWORD_SUCCESS,
  LOAD_USER_FAIL,
  LOAD_USER_REQUEST,
  LOAD_USER_SUCCESS,
  LOGIN_USER_FAIL,
  LOGIN_USER_REQUEST,
  LOGIN_USER_SUCCESS,
  LOGOUT_USER_FAIL,
  LOGOUT_USER_SUCCESS,
  REGISTER_USER_FAIL,
  REGISTER_USER_REQUEST,
  REGISTER_USER_SUCCESS,
  RESET_PASSWORD_FAIL,
  RESET_PASSWORD_REQUEST,
  RESET_PASSWORD_SUCCESS,
  UNFOLLOW_USER_FAIL,
  UNFOLLOW_USER_REQUEST,
  UNFOLLOW_USER_SUCCESS,
  UPDATE_PASSWORD_FAIL,
  UPDATE_PASSWORD_REQUEST,
  UPDATE_PASSWORD_RESET,
  UPDATE_PASSWORD_SUCCESS,
  UPDATE_PROFILE_FAIL,
  UPDATE_PROFILE_REQUEST,
  UPDATE_PROFILE_RESET,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_SETTINGS_FAIL,
  UPDATE_SETTINGS_REQUEST,
  UPDATE_SETTINGS_SUCCESS,
  GET_HISTORY_REQUEST,
  GET_HISTORY_SUCCESS,
  GET_HISTORY_FAIL,
  UPDATE_HISTORY_LAST_POST,
  USER_DETAILS_FAIL,
  USER_DETAILS_REQUEST,
  USER_DETAILS_RESET,
  USER_DETAILS_SUCCESS,
} from '../constants/userConstants';
import { reject } from 'lodash';

export const userReducer = (
  state = { loading: false, is_authenticated: false, user: null, error: null },
  { type, payload },
) => {
  switch (type) {
    case LOGIN_USER_REQUEST:
    case REGISTER_USER_REQUEST:
    case LOAD_USER_REQUEST:
      return {
        loading: true,
        is_authenticated: false,
      };
    case LOGIN_USER_SUCCESS:
    case REGISTER_USER_SUCCESS:
    case LOAD_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        is_authenticated: true,
        user: { ...payload.user },
      };
    case LOGOUT_USER_SUCCESS:
      return {
        loading: false,
        user: null,
        is_authenticated: false,
      };
    case LOGIN_USER_FAIL:
    case REGISTER_USER_FAIL:
      return {
        ...state,
        loading: false,
        is_authenticated: false,
        user: null,
        error: payload,
      };
    case LOAD_USER_FAIL:
      return {
        loading: false,
        is_authenticated: false,
        user: null,
        error: payload,
      };
    case LOGOUT_USER_FAIL:
      return {
        ...state,
        loading: false,
        error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    case UNFOLLOW_USER_SUCCESS:
      const newFollowings = reject(state.user.followings, {
        id: payload.followingId,
      });
      return {
        ...state,
        user: {
          ...state.user,
          followings: newFollowings,
          following_count: newFollowings.length,
        },
      };
    case FOLLOW_USER_SUCCESS:
      const newFollowing = {
        ...payload.following,
        user: payload.following.user.id,
      };
      return {
        ...state,
        user: {
          ...state.user,
          followings: [...state.user.followings, newFollowing],
          following_count: [...state.user.followings, newFollowing].length,
        },
      };
    case UPDATE_SETTINGS_SUCCESS:
      return {
        ...state,
        user: {
          ...state.user,
          settings: payload,
        },
      };
    default:
      return state;
  }
};

export const forgotPasswordReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case FORGOT_PASSWORD_REQUEST:
    case RESET_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case FORGOT_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        message: payload,
      };
    case RESET_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        success: payload,
      };
    case FORGOT_PASSWORD_FAIL:
    case RESET_PASSWORD_FAIL:
      return {
        ...state,
        loading: false,
        error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const userDetailsReducer = (
  state = { user: null },
  { type, payload },
) => {
  switch (type) {
    case USER_DETAILS_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case USER_DETAILS_SUCCESS:
      return {
        loading: false,
        user: payload.user,
      };
    case USER_DETAILS_RESET:
      return {
        ...state,
        user: null,
      };
    case USER_DETAILS_FAIL:
      return {
        ...state,
        loading: false,
        error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    case UNFOLLOW_USER_SUCCESS:
      if (state.user.id === payload.currentUserId) {
        const newFollowings = reject(state.user.followings, {
          id: payload.followingId,
        });
        return {
          ...state,
          user: {
            ...state.user,
            followings: newFollowings,
            following_count: newFollowings.length,
          },
        };
      } else {
        const newFollowers = reject(state.user.followers, {
          id: payload.followingId,
        });
        return {
          ...state,
          user: {
            ...state.user,
            followers: newFollowers,
            follower_count: newFollowers.length,
          },
        };
      }
    case FOLLOW_USER_SUCCESS:
      if (state.user.id === payload.currentUserId) {
        const newFollowing = {
          ...payload.following,
          user: payload.following.user.id,
        };
        const newFollowings = [...state.user.followings, newFollowing];
        return {
          ...state,
          user: {
            ...state.user,
            followings: newFollowings,
            following_count: newFollowings.length,
          },
        };
      } else if (state.user.id === payload.following.following_user.id) {
        const newFollowing = {
          ...payload.following,
          following_user: payload.following.following_user.id,
        };
        const newFollowers = [...state.user.followers, newFollowing];
        return {
          ...state,
          user: {
            ...state.user,
            followers: newFollowers,
            follower_count: newFollowers.length,
          },
        };
      } else {
        return state;
      }
    default:
      return state;
  }
};

export const allUsersReducer = (state = { users: [] }, { type, payload }) => {
  switch (type) {
    case ALL_USERS_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case ALL_USERS_SUCCESS:
      return {
        loading: false,
        users: payload,
      };
    case ALL_USERS_FAIL:
      return {
        ...state,
        loading: false,
        error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const followUserReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case FOLLOW_USER_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case FOLLOW_USER_SUCCESS:
      return {
        loading: false,
        success: true,
        message: payload,
      };
    case FOLLOW_USER_FAIL:
      return {
        ...state,
        success: false,
        loading: false,
        error: payload,
      };
    case FOLLOW_USER_RESET:
      return {
        ...state,
        success: false,
        message: null,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    case UNFOLLOW_USER_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case UNFOLLOW_USER_SUCCESS:
      return {
        loading: false,
        success: true,
      };
    case UNFOLLOW_USER_FAIL:
      return {
        ...state,
        loading: false,
        success: false,
        message: payload,
      };
    default:
      return state;
  }
};

export const profileReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case UPDATE_PROFILE_REQUEST:
    case UPDATE_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case UPDATE_PROFILE_SUCCESS:
    case UPDATE_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        isUpdated: true,
      };
    case UPDATE_PROFILE_FAIL:
    case UPDATE_PASSWORD_FAIL:
      return {
        ...state,
        loading: false,
        error: payload,
      };
    case UPDATE_PROFILE_RESET:
    case UPDATE_PASSWORD_RESET:
      return {
        ...state,
        isUpdated: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const settingsReducer = (
  state = { loading: false, error: undefined },
  { type, payload },
) => {
  switch (type) {
    case UPDATE_SETTINGS_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case UPDATE_SETTINGS_SUCCESS:
      return {
        loading: false,
        error: undefined,
      };
    case UPDATE_SETTINGS_FAIL:
      return {
        loading: false,
        error: payload,
      };
    default:
      return state;
  }
};

export const historyReducer = (state = { lastPost: null, lastStory: null, loading: false, error: null }, action) => {
  switch (action.type) {
    case GET_HISTORY_REQUEST:
      return { ...state, loading: true };

    case GET_HISTORY_SUCCESS:
      const { last_post, last_story } = action.payload[0];
      return { ...state, loading: false, lastPost: last_post || null,
        lastStory: last_story || null };

    case UPDATE_HISTORY_LAST_POST:
      return { ...state, lastPost: action.payload };

    case GET_HISTORY_FAIL:
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};
