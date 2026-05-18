import {
  CLEAR_ERRORS,
  POST_REPORT_FAIL,
  POST_REPORT_REQUEST,
  POST_REPORT_RESET,
  POST_REPORT_SUCCESS,
  REPORT_IGNORE_FAIL,
  REPORT_IGNORE_RESET,
  REPORT_IGNORE_SUCCESS,
  USER_RESTRICT_CREATE_FAIL,
  USER_RESTRICT_CREATE_RESET,
  USER_RESTRICT_CREATE_SUCCESS,
  USER_RESTRICT_DELETE_FAIL,
  USER_RESTRICT_DELETE_RESET,
  USER_RESTRICT_DELETE_SUCCESS,
  USER_RESTRICT_FAIL,
  USER_RESTRICT_REQUEST,
  USER_RESTRICT_RESET,
  USER_RESTRICT_SUCCESS,
} from '../constants/moderationConstants';
import { DELETE_POST_FAIL, DELETE_POST_RESET, DELETE_POST_SUCCESS } from '../constants/postConstants';
import { reject } from 'lodash';

export const reportPostReducer = (state = {
  loading: false, error: false, reports: [], nextPageNumber: 1, totalReports: 0,
}, { type, payload }) => {
  switch (type) {
    case POST_REPORT_REQUEST:
      return {
        ...state, loading: true,
      };
    case POST_REPORT_SUCCESS:
      let nextPage = undefined;
      if (payload.nextPostURL) {
        const nextPostURL = new URL(payload.nextPostURL);
        const params = new URLSearchParams(nextPostURL.search);
        nextPage = params.get('page');
      }
      return {
        loading: false,
        reports: [...state.reports, ...payload.reports],
        nextPageNumber: nextPage,
        totalReports: payload.totalReports,
      };
    case POST_REPORT_FAIL:
      return {
        ...state, loading: false, error: true,
      };
    case POST_REPORT_RESET:
      return {
        ...state, reports: [], totalReports: 0,
      };
    case DELETE_POST_SUCCESS:
      return {
        ...state,
        reports: state.reports.filter(report => report.post.id !== payload.postId),
        totalReports: state.totalReports - 1,
      };
    case REPORT_IGNORE_SUCCESS:
      return {
        ...state, reports: reject(state.reports, { id: payload }), totalReports: state.totalReports - 1,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: false,
      };
    default:
      return state;
  }
};

export const moderationReducer = (state = { error: false, moderationType: null, success: false }, {
  type,
}) => {
  switch (type) {
    case REPORT_IGNORE_SUCCESS:
      return {
        error: false, moderationType: 'report', success: true,
      };
    case REPORT_IGNORE_FAIL:
      return {
        error: true, moderationType: 'report', success: false,
      };
    case REPORT_IGNORE_RESET:
      return {
        error: false, moderationType: 'report', success: false,
      };
    case DELETE_POST_SUCCESS:
      return {
        error: false, moderationType: 'post', success: true,
      };
    case DELETE_POST_FAIL:
      return {
        error: true, moderationType: 'post', success: false,
      };
    case DELETE_POST_RESET:
      return {
        error: false, moderationType: 'post', success: false,
      };
    case USER_RESTRICT_CREATE_SUCCESS:
      return {
        error: false, moderationType: 'user-restrict', success: true,
      };
    case USER_RESTRICT_CREATE_FAIL:
      return {
        error: true, moderationType: 'user-restrict', success: false,
      };
    case USER_RESTRICT_CREATE_RESET:
      return {
        error: false, moderationType: 'user-restrict', success: false,
      };
    case USER_RESTRICT_DELETE_SUCCESS:
      return {
        error: false, moderationType: 'user-unrestrict', success: true,
      };
    case USER_RESTRICT_DELETE_FAIL:
      return {
        error: true, moderationType: 'user-unrestrict', success: false,
      };
    case USER_RESTRICT_DELETE_RESET:
      return {
        error: false, moderationType: 'user-unrestrict', success: false,
      };
    case CLEAR_ERRORS:
      return {
        error: false, moderationType: null, success: false,
      }
        ;
    default:
      return state;
  }
};

export const restrictUserReducer = (state = {
  error: false, loading: false, users: [], nextPageNumber: 1, totalUsers: 0,
}, { type, payload }) => {
  switch (type) {
    case USER_RESTRICT_REQUEST:
      return {
        ...state, loading: true,
      };
    case USER_RESTRICT_SUCCESS:
      let nextPage = undefined;
      if (payload.nextPostURL) {
        const nextPostURL = new URL(payload.nextPostURL);
        const params = new URLSearchParams(nextPostURL.search);
        nextPage = params.get('page');
      }
      return {
        loading: false,
        users: [...state.users, ...payload.users],
        nextPageNumber: nextPage,
        totalUsers: payload.totalUsers,
      };
    case USER_RESTRICT_FAIL:
      return {
        ...state, loading: false, error: true,
      };
    case USER_RESTRICT_RESET:
      return {
        ...state, users: [], totalUsers: 0, error: false,
      };
    case USER_RESTRICT_DELETE_SUCCESS:
      return {
        ...state,
        users: reject(state.users, { id: payload }), totalUsers: state.totalUsers - 1,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: false,
      };
    default:
      return state;
  }
};
