export const analyticsReducer = (state = {
  totalStudentCount: 0,
  totalPostCount: 0,
  totalStoryCount: 0,
  totalLikeCount: 0,
  totalCommentCount: 0,
  students: [],
  profiles: [],
  posts: [],
  h_counter: {},
  hashtags: {},
}, { type, payload }) => {
  switch (type) {
    case 'ANALYTICS_REQUEST':
      return state;
    case 'ANALYTICS_SUCCESS':
      return {
        ...state,
        totalStudentCount: payload.total_student_count,
        totalPostCount: payload.total_post_count,
        totalStoryCount: payload.total_story_count,
        totalLikeCount: payload.total_like_count,
        totalCommentCount: payload.total_comment_count,
        students: payload.students || [],
        profiles: payload.profiles || [],
        posts: payload.posts || [],
        h_counter: payload.h_counter || {},
        hashtags: payload.hashtags || [],
      };
    case 'ANALYTICS_FAIL':
      return state;
    default:
      return state;
  }

};
