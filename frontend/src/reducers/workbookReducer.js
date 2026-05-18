import {
  WORKBOOK_SECTIONS_REQUEST,
  WORKBOOK_SECTIONS_SUCCESS,
  WORKBOOK_SECTIONS_FAIL,
  WORKBOOK_SECTIONS_RESET,
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

// Reducer function

export const workbookSectionsReducer = (
  state = {
    loading: false,
    sections: [],
    error: null,
  },
  action
) => {
  switch (action.type) {
    case WORKBOOK_SECTIONS_REQUEST:
      return {
        ...state,
        loading: true,
      };
    case WORKBOOK_SECTIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        sections: action.payload,
      };
    case WORKBOOK_SECTIONS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case WORKBOOK_SECTIONS_RESET:
      return {
        ...state,
        sections: [],
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

export const userPointsReducer = (
  state = {
    points: 0,
    error: null,
  },
  action
) => {
  switch (action.type) {
    case FETCH_USER_POINTS:
      return { ...state, points: action.payload };
    case UPDATE_USER_POINTS:
      return { ...state, points: action.payload };
    case FETCH_USER_POINTS_FAIL:
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const userFeatureReducer = (
  state = {
    loading: false,
    features: [],
    errors: {},
    successes: {},
  },
  action
) => {
  switch (action.type) {
    case FETCH_FEATURES_REQUEST:
      return { ...state, loading: true };
    case FETCH_FEATURES_SUCCESS:
      return { ...state, loading: false, features: action.payload };
    case FETCH_FEATURES_FAIL:
      return { ...state, loading: false, errors: { global: action.payload } };
    case UNLOCK_FEATURE_REQUEST:
      return {
        ...state,
        loading: true,
        errors: { ...state.errors, [action.payload]: null },
      };
    case UNLOCK_FEATURE_SUCCESS:
      return {
        ...state,
        loading: false,
        successes: { ...state.successes, [action.payload]: true },
        features: state.features.map((feature) =>
          feature.feature_name === action.payload
            ? { ...feature, is_unlocked: true }
            : feature
        ),
      };
    case UNLOCK_FEATURE_FAIL:
      return {
        ...state,
        loading: false,
        successes: { ...state.successes, [action.payload.featureName]: false },
        errors: {
          ...state.errors,
          [action.payload.featureName]: action.payload.error,
        },
      };
    case CLEAR_FEATURE_ERRORS:
      return { ...state, successes: {}, errors: {} };
    default:
      return state;
  }
};
