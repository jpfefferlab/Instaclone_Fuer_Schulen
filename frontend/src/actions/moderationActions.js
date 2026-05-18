import axios from '../Routes/axios';
import {
  CLEAR_ERRORS,
  POST_REPORT_FAIL,
  POST_REPORT_REQUEST,
  POST_REPORT_SUCCESS,
  REPORT_IGNORE_FAIL,
  REPORT_IGNORE_SUCCESS,
  USER_RESTRICT_CREATE_FAIL,
  USER_RESTRICT_CREATE_SUCCESS,
  USER_RESTRICT_DELETE_FAIL,
  USER_RESTRICT_DELETE_SUCCESS,
  USER_RESTRICT_FAIL,
  USER_RESTRICT_REQUEST,
  USER_RESTRICT_SUCCESS,
} from '../constants/moderationConstants';


export const getPostReports = (nextPage) => async (dispatch) => {
  try {
    dispatch({ type: POST_REPORT_REQUEST });
    const { data } = await axios.get('/api/post-reports/', { params: { page: nextPage } });
    dispatch({
      type: POST_REPORT_SUCCESS, payload: {
        reports: data.results,
        nextPostURL: data.next,
        totalReports: data.count,
      },
    });
  } catch (error) {
    dispatch({
      type: POST_REPORT_FAIL, payload: error.response.data.message,
    });
  }
};

export const getRestrictedUsers = (nextPage) => async (dispatch) => {
  try {
    dispatch({ type: USER_RESTRICT_REQUEST });
    const { data } = await axios.get('/api/restricted-users/', { params: { page: nextPage } });
    dispatch({
      type: USER_RESTRICT_SUCCESS, payload: {
        users: data.results,
        nextPostURL: data.next,
        totalUsers: data.count,
      },
    });
  } catch (error) {
    dispatch({
      type: USER_RESTRICT_FAIL, payload: error.response.data.message,
    });
  }
};

export const ignoreReport = (id) => async (dispatch) => {
  try {
    await axios.delete(`/api/post-reports/${id}/`);
    dispatch({
      type: REPORT_IGNORE_SUCCESS, payload: id,
    });
  } catch (error) {
    dispatch({
      type: REPORT_IGNORE_FAIL, payload: error.response.data.message,
    });
  }
};

export const restrictUser = (id) => async (dispatch) => {
  try {
    await axios.post(`/api/restricted-users/restrict/`, { user_id: id });
    dispatch({ type: USER_RESTRICT_CREATE_SUCCESS, payload: id });
  } catch (error) {
    dispatch({ type: USER_RESTRICT_CREATE_FAIL });
  }
};

export const unrestrictUser = (id) => async (dispatch) => {
  try {
    await axios.post(`/api/restricted-users/unrestrict/`, { user_id: id });
    dispatch({ type: USER_RESTRICT_DELETE_SUCCESS, payload: id });
  } catch (error) {
    dispatch({ type: USER_RESTRICT_DELETE_FAIL });
  }
};


export const clearErrors = () => async (dispatch) => {
  dispatch({ type: CLEAR_ERRORS });
};
