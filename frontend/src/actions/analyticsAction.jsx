import axios from '../Routes/axios';
import { ANALYTICS_FAIL, ANALYTICS_REQUEST, ANALYTICS_SUCCESS } from '../constants/analyticsConstants';

export const getAnalytics = () => {
  return async (dispatch) => {
    try {
      dispatch({ type: ANALYTICS_REQUEST });
      const config = { header: { 'Content-Type': 'application/json' } };
      const { data } = await axios.get('/api/analytics/', config);
      dispatch({
        type: ANALYTICS_SUCCESS, payload: data,
      });
    } catch (error) {
      dispatch({
        type: ANALYTICS_FAIL,
        payload: error.response.data.message,
      });
    }
  };
};
