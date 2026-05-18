import axios from '../Routes/axios';
import {
  WORKBOOK_SECTIONS_REQUEST,
  WORKBOOK_SECTIONS_SUCCESS,
  WORKBOOK_SECTIONS_FAIL,
  CLEAR_ERRORS,
  CLEAR_FEATURE_ERRORS,
  FETCH_USER_POINTS,
  FETCH_USER_POINTS_FAIL,
  UPDATE_USER_POINTS,
  FETCH_FEATURES_REQUEST,
  FETCH_FEATURES_SUCCESS,
  FETCH_FEATURES_FAIL,
  UNLOCK_FEATURE_REQUEST,
  UNLOCK_FEATURE_SUCCESS,
  UNLOCK_FEATURE_FAIL,
} from '../constants/workbookConstants';

// Get the section data
export const fetchWorkbookSections = () => async (dispatch) => {
  try {
    dispatch({ type: WORKBOOK_SECTIONS_REQUEST });
    const { data } = await axios.get('/api/workbook/sections');

    dispatch({
      type: WORKBOOK_SECTIONS_SUCCESS,
      payload: data,
    });
  } catch (error) {
    dispatch({
      type: WORKBOOK_SECTIONS_FAIL,
      payload: error.response?.data?.message || error.message,
    });
  }
};

// Fetch points for user
export const fetchUserPoints = () => async (dispatch) => {
  try {
    const response = await axios.get('/api/user/points');
    dispatch({
      type: FETCH_USER_POINTS,
      payload: response.data.points_balance,
    });
  } catch (error) {
    dispatch({
      type: FETCH_USER_POINTS_FAIL,
      payload: error.response?.data?.message || error.message,
    });
    console.error('Error fetching user points', error);
  }
};

// Update points after claiming
export const updateUserPoints = (newPoints) => ({
  type: UPDATE_USER_POINTS,
  payload: newPoints,
});

export const fetchUserFeatures = () => async (dispatch) => {
  try {
    dispatch({ type: FETCH_FEATURES_REQUEST });
    const response = await axios.get('/api/user/features/');
    // Check if the response is an array or a single object
    const featuresData = Array.isArray(response.data)
      ? response.data
      : [response.data];
    dispatch({ type: FETCH_FEATURES_SUCCESS, payload: featuresData });
  } catch (error) {
    dispatch({ type: FETCH_FEATURES_FAIL, payload: error.message });
  }
};

export const unlockFeature = (featureName) => async (dispatch) => {
  try {
    dispatch({ type: UNLOCK_FEATURE_REQUEST, payload: featureName });
    const response = await axios.post(`/api/features/unlock/`, {
      feature_name: featureName,
    });
    const { points_balance } = response.data;
    // Update the unlocked feature state
    dispatch({ type: UNLOCK_FEATURE_SUCCESS, payload: featureName });
    // Update the points in the Redux store
    dispatch(updateUserPoints(points_balance));
  } catch (error) {
    dispatch({
      type: UNLOCK_FEATURE_FAIL,
      payload: { featureName: featureName, error: error.message },
    });
  }
};

// Clear Errors
export const clearErrors = () => async (dispatch) => {
  dispatch({ type: CLEAR_ERRORS });
};

// Clear Feature-related errors
export const clearFeatureErrors = () => async (dispatch) => {
  dispatch({ type: CLEAR_FEATURE_ERRORS });
};
