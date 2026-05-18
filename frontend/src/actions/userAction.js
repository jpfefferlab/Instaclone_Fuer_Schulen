import {
    ALL_USERS_FAIL,
    ALL_USERS_REQUEST,
    ALL_USERS_SUCCESS,
    CLEAR_ERRORS,
    FOLLOW_USER_FAIL,
    FOLLOW_USER_REQUEST,
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
    UPDATE_PASSWORD_SUCCESS,
    UPDATE_PROFILE_FAIL,
    UPDATE_PROFILE_REQUEST,
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
    USER_DETAILS_SUCCESS,
} from '../constants/userConstants';
import axios from '../Routes/axios';
import store from '../store';
import { toast } from 'react-toastify';
import { t } from 'i18next';


// Login User
export const loginUser = (username, password) => async (dispatch) => {
    try {
        dispatch({ type: LOGIN_USER_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const { data } = await axios.post('/api/auth/login/', { username, password }, config);
        localStorage.setItem('jwt', data.access_token);
        const d = new Date();
        d.setDate(d.getDate() + 3);
        localStorage.setItem('session_exp', d);
        dispatch({
            type: LOGIN_USER_SUCCESS, payload: { user: data.user },
        });
    } catch (error) {
        dispatch({
            type: LOGIN_USER_FAIL, payload: 'Please check credentials',
        });
    }
};

// Register User
export const registerUser = (userData) => async (dispatch) => {
    try {
        dispatch({ type: REGISTER_USER_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        };

        const { data } = await axios.post('/api/v1/signup', userData, config);

        dispatch({
            type: REGISTER_USER_SUCCESS, payload: data.user,
        });
    } catch (error) {
        dispatch({
            type: REGISTER_USER_FAIL, payload: error.response.data.message,
        });
    }
};

// Load User
export const loadUser = () => async (dispatch) => {
    try {
        dispatch({ type: LOAD_USER_REQUEST });

        const { data } = await axios.get('/api/users/me/');
        dispatch({
            type: LOAD_USER_SUCCESS, payload: { user: data },
        });
    } catch (error) {
        switch (error.response.data.code) {
            case 'token_not_valid':
                localStorage.clear();
                axios.defaults.headers.common['Authorization'] = ``;
                dispatch({
                    type: LOAD_USER_FAIL, payload: error.response,
                });
                break;
            default:
                dispatch({
                    type: LOAD_USER_FAIL, payload: error.response,
                });
        }
    }
};

// Logout User
export const logoutUser = () => async (dispatch) => {
    try {
        await axios.post('/api/auth/logout/');
        localStorage.removeItem('jwt');
        localStorage.removeItem('session_exp');
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('selectedExercise');
        dispatch({ type: LOGOUT_USER_SUCCESS });
    } catch (error) {
        dispatch({
            type: LOGOUT_USER_FAIL, payload: error.response.data.message,
        });
    }
};

// Get User Details
export const getUserDetails = (username = 'me') => async (dispatch) => {
    try {
        dispatch({ type: USER_DETAILS_REQUEST });
        const { data } = await axios.get(`/api/users/${username}/`);
        dispatch({
            type: USER_DETAILS_SUCCESS, payload: {
                user: data,
            },
        });
    } catch (error) {
        dispatch({
            type: USER_DETAILS_FAIL, payload: error.response.data.message,
        });
    }
};

// Get Suggested Users
export const getSuggestedUsers = () => async (dispatch) => {
    try {
        dispatch({ type: ALL_USERS_REQUEST });

        setTimeout(async () => {
            const { data } = await axios.get('/api/users/suggestions/');
            dispatch({
                type: ALL_USERS_SUCCESS, payload: data,
            });
        }, 600);
    } catch (error) {
        dispatch({
            type: ALL_USERS_FAIL, payload: error.response.data.message,
        });
    }
};

// Follow | Unfollow User
export const followUser = (userId) => async (dispatch) => {
    try {
        dispatch({ type: FOLLOW_USER_REQUEST });
        const currentUser = store.getState().user.user;
        const config = { header: { 'Content-Type': 'application/json' } };
        const body = { following_user: userId, user: currentUser.id };
        const { data } = await axios.post(`/api/followings/`, body, config);
        dispatch({
            type: FOLLOW_USER_SUCCESS, payload: { following: data, currentUserId: currentUser.id },
        });
    } catch (error) {
        const errorMessage = error.response && error.response.data && error.response.data.message
            ? error.response.data.message
            : error.message || 'Something went wrong';

        dispatch({
            type: FOLLOW_USER_FAIL, payload: error.response.data.message,
        });
    }
};

export const unfollowUser = (userId) => async (dispatch) => {
    try {
        dispatch({ type: UNFOLLOW_USER_REQUEST });
        const currentUser = store.getState().user.user;
        const following = currentUser.followings.find((f) => f.following_user.id === userId);
        await axios.delete('/api/followings/' + following.id + '/');
        dispatch({
            type: UNFOLLOW_USER_SUCCESS, payload: { followingId: following.id, currentUserId: currentUser.id },
        });
    } catch (error) {
        dispatch({
            type: UNFOLLOW_USER_FAIL, payload: error.response.data.message,
        });
    }
};

// Forgot Password
export const forgotPassword = (email) => async (dispatch) => {
    try {
        dispatch({ type: FORGOT_PASSWORD_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const { data } = await axios.post('/api/v1/password/forgot', { email }, config);

        dispatch({
            type: FORGOT_PASSWORD_SUCCESS, payload: data.message,
        });
    } catch (error) {
        dispatch({
            type: FORGOT_PASSWORD_FAIL, payload: error.response.data.message,
        });
    }
};

// Reset Password
export const resetPassword = (token, password) => async (dispatch) => {
    try {
        dispatch({ type: RESET_PASSWORD_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const { data } = await axios.put(`/api/v1/password/reset/${token}`, { password }, config);

        dispatch({
            type: RESET_PASSWORD_SUCCESS, payload: data.success,
        });
    } catch (error) {
        dispatch({
            type: RESET_PASSWORD_FAIL, payload: error.response.data.message,
        });
    }
};

// Update User Profile
export const updateProfile = (formData, user) => async (dispatch) => {
    try {
        dispatch({ type: UPDATE_PROFILE_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const { data } = await axios.put('/api/users/' + user.id.toString() + '/', formData, config);

        dispatch({
            type: UPDATE_PROFILE_SUCCESS, payload: data.success,
        });
    } catch (error) {
        dispatch({
            type: UPDATE_PROFILE_FAIL, payload: error.response.data.message,
        });
    }
};

export const updateSettings = (formData, user) => async (dispatch) => {
    try {
        dispatch({ type: UPDATE_SETTINGS_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (user.settings) {
            const { data } = await axios.put('/api/user-settings/' + user.settings.id + '/', formData, config);
            dispatch({ type: UPDATE_SETTINGS_SUCCESS, payload: data });
            toast.success(t('settings_updated'));
        } else {
            const { data } = await axios.post('/api/user-settings/', formData, config);
            dispatch({ type: UPDATE_SETTINGS_SUCCESS, payload: data });
            toast.success(t('settings_updated'));
        }
    } catch (error) {
        dispatch({ type: UPDATE_SETTINGS_FAIL, payload: error });
        toast.error(error);
    }
};

// Update User Password
export const updatePassword = (passwords) => async (dispatch) => {
    try {
        dispatch({ type: UPDATE_PASSWORD_REQUEST });

        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        const { data } = await axios.put('/api/v1/update/password', passwords, config);

        dispatch({
            type: UPDATE_PASSWORD_SUCCESS, payload: data.success,
        });
    } catch (error) {
        dispatch({
            type: UPDATE_PASSWORD_FAIL, payload: error.response.data.message,
        });
    }
};

export const getUserHistory = () => async (dispatch) => {
    try {
      dispatch({ type: GET_HISTORY_REQUEST });

      const { data } = await axios.get('/api/user-history/');

      dispatch({
        type: GET_HISTORY_SUCCESS,
        payload: data,
      });
    } catch (error) {
      dispatch({
        type: GET_HISTORY_FAIL,
        payload: error.response && error.response.data.message
          ? error.response.data.message
          : error.message,
      });
    }
  };

export const updateLastPost = (newPostTimestamp) => ({
	type: UPDATE_HISTORY_LAST_POST,
	payload: newPostTimestamp,
});

// Clear All Errors
export const clearErrors = () => async (dispatch) => {
    dispatch({ type: CLEAR_ERRORS });
};
