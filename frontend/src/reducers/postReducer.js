import { reject } from 'lodash';

import {
  ACTION_FAIL,
  ACTION_REQUEST,
  ACTION_RESET,
  ACTION_SUCCESS,
  ALL_POSTS_FAIL,
  ALL_POSTS_REQUEST,
  ALL_POSTS_RESET,
  ALL_POSTS_SUCCESS,
  CLEAR_ERRORS,
  DELETE_COMMENT_FAIL,
  DELETE_COMMENT_RESET,
  DELETE_COMMENT_SUCCESS,
  DELETE_POST_FAIL,
  DELETE_POST_REQUEST,
  DELETE_POST_RESET,
  DELETE_POST_SUCCESS,
  DELETE_TAG_FAIL,
  DELETE_TAG_REQUEST,
  DELETE_TAG_RESET,
  DELETE_TAG_SUCCESS,
  EDIT_POST_FAIL,
  EDIT_POST_REQUEST,
  EDIT_POST_RESET,
  EDIT_POST_SUCCESS,
  GET_LIKES_SUCCESS,
  LIKE_UNLIKE_POST_FAIL,
  LIKE_UNLIKE_POST_REQUEST,
  LIKE_UNLIKE_POST_RESET,
  LIKE_UNLIKE_POST_SUCCESS,
  NEW_ADVERTISEMENT_FAIL,
  NEW_ADVERTISEMENT_REQUEST,
  NEW_ADVERTISEMENT_SUCCESS,
  NEW_COMMENT_FAIL,
  NEW_COMMENT_REQUEST,
  NEW_COMMENT_RESET,
  NEW_COMMENT_SUCCESS,
  NEW_POST_FAIL,
  NEW_POST_REQUEST,
  NEW_POST_RESET,
  NEW_POST_SUCCESS,
  NEWSFEED_FAIL,
  NEWSFEED_REQUEST,
  NEWSFEED_RESET,
  NEWSFEED_SUCCESS,
  SAVE_UNSAVE_POST_FAIL,
  SAVE_UNSAVE_POST_REQUEST,
  SAVE_UNSAVE_POST_RESET,
  SAVE_UNSAVE_POST_SUCCESS,
} from '../constants/postConstants';

// New Post Reducer
export const newPostReducer = (state = { loading: false, post: null, success: undefined, error: null }, {
  type, payload,
}) => {
  switch (type) {
    case NEW_POST_REQUEST:
      return {
        ...state, loading: true,
      };
    case NEW_POST_SUCCESS:
      return {
        loading: false, success: payload.success, post: payload.post,
      };
    case NEW_POST_FAIL:
      return {
        ...state, loading: false, error: payload,
      };
    case NEW_POST_RESET:
      return {
        ...state, success: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const newAdvertisementReducer = (state = {
  loading: false, advertisements: undefined,
}, { type, payload }) => {
  switch (type) {
    case NEW_ADVERTISEMENT_REQUEST:
      return {
        ...state, loading: true,
      };
    case NEW_ADVERTISEMENT_SUCCESS:
      return {
        loading: false, advertisements: payload,
      };
    case NEW_ADVERTISEMENT_FAIL:
      return {
        ...state, loading: false,
      };
    default:
      return state;
  }
};

export const newsfeedReducer = (state = { posts: [] }, { type, payload }) => {
  switch (type) {
    case NEWSFEED_REQUEST:
      return {
        ...state, loading: true,
      };
    case NEWSFEED_SUCCESS:
      let nextPageNumber = undefined;
      if (payload.nextPageUrl) {
        const nextPageUrl = new URL(payload.nextPageUrl);
        const params = new URLSearchParams(nextPageUrl.search);
        nextPageNumber = params.get('page');
      }
      return {
        loading: false,
        posts: [...state.posts, ...payload.posts],
        totalPosts: payload.totalPosts,
        nextPageNumber: nextPageNumber,
      };
    case NEWSFEED_RESET:
      return {
        ...state, posts: [], totalPosts: 0,
      };
    case NEWSFEED_FAIL:
      return {
        ...state, loading: false, error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    case NEW_POST_SUCCESS:
      return {
        ...state, posts: [payload.post, ...state.posts], totalPosts: state.totalPosts + 1,
      };

    case DELETE_POST_SUCCESS:
      return {
        ...state, posts: reject(state.posts, { id: payload.postId }), totalPosts: state.totalPosts - 1,
      };
    case DELETE_TAG_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
          ...post, image_tags: post.image_tags.filter(tag => tag.id !== payload.tagID),
        } : post),
      };
    case LIKE_UNLIKE_POST_SUCCESS:
      if (payload.likeType) {
        return {
          ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
            ...post, likes: [...post.likes, payload.data],
          } : post),
        };
      } else {
        return {
          ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
            ...post, likes: reject(post.likes, { id: payload.likeID }),
          } : post),
        };
      }
    case GET_LIKES_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.post ? {
          ...post, likes: payload,
        } : post),
      };
    case NEW_COMMENT_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.post ? {
          ...post, comments: [...post.comments, payload],
        } : post),
      };
    case DELETE_COMMENT_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
          ...post, comments: reject(post.comments, { id: payload.commentID }),
        } : post),
      };
    case EDIT_POST_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.id ? {
          ...post, ...payload,
        } : post),
      };
    default:
      return state;
  }
};

export const allPostsReducer = (state = { posts: [] }, { type, payload }) => {
  switch (type) {
    case ALL_POSTS_REQUEST:
      return {
        ...state, loading: true,
      };
    case ALL_POSTS_SUCCESS:
      let nextPageNumber = undefined;
      if (payload.nextPageUrl) {
        const nextPageUrl = new URL(payload.nextPageUrl);
        const params = new URLSearchParams(nextPageUrl.search);
        nextPageNumber = params.get('page');
      }
      return {
        loading: false,
        posts: [...state.posts, ...payload.posts],
        totalPosts: payload.totalPosts,
        nextPageNumber: nextPageNumber,
        user_id: payload.user_id,
      };
    case ALL_POSTS_RESET:
      return {
        ...state, posts: [], totalPosts: 0,
      };
    case ALL_POSTS_FAIL:
      return {
        ...state, loading: false, error: payload,
      };
    case CLEAR_ERRORS:
      return {
        ...state, updateSuccess: false, error: null,
      };
    case NEW_POST_SUCCESS:
      if (payload.post.creator.id === state.user_id) {
        return {
          ...state, posts: [payload.post, ...state.posts], totalPosts: state.totalPosts + 1,
        };
      }
      return state;
    case NEW_ADVERTISEMENT_SUCCESS:
      return state;
    case DELETE_POST_SUCCESS:
      return {
        ...state, posts: reject(state.posts, { id: payload.postId }), totalPosts: state.totalPosts - 1,
      };
    case DELETE_TAG_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.postId ? {
          ...post, image_tags: post.image_tags.filter(tag => tag.id !== payload.tagID),
        } : post),
      };
    case LIKE_UNLIKE_POST_SUCCESS:
      if (payload.likeType) {
        return {
          ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
            ...post, likes: [...post.likes, payload.data],
          } : post),
        };
      } else {
        return {
          ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
            ...post, likes: reject(post.likes, { id: payload.likeID }),
          } : post),
        };
      }
    case GET_LIKES_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.post ? {
          ...post, likes: payload,
        } : post),
      };
    case NEW_COMMENT_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.post ? {
          ...post, comments: [...post.comments, payload],
        } : post),
      };
    case DELETE_COMMENT_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.postID ? {
          ...post, comments: reject(post.comments, { id: payload.commentID }),
        } : post),
      };
    case EDIT_POST_SUCCESS:
      return {
        ...state, posts: state.posts.map((post) => post.id === payload.id ? {
          ...post, ...payload,
        } : post),
      };
    default:
      return state;
  }
};


export const likePostReducer = (state = { loading: false, success: false, likeType: undefined, error: false }, {
  type, payload,
}) => {
  switch (type) {
    case LIKE_UNLIKE_POST_REQUEST:
      return {
        ...state, loading: true,
      };
    case LIKE_UNLIKE_POST_SUCCESS:
      return {
        loading: false, success: true, likeType: payload.likeType,
      };
    case LIKE_UNLIKE_POST_FAIL:
      return {
        ...state, loading: false, error: true, success: false,
      };
    case LIKE_UNLIKE_POST_RESET:
      return {
        ...state, success: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const newCommentReducer = (state = { loading: false, success: false, error: false }, { type, payload }) => {
  switch (type) {
    case NEW_COMMENT_REQUEST:
      return {
        ...state, loading: true,
      };
    case NEW_COMMENT_SUCCESS:
      return {
        loading: false, success: payload, error: false,
      };
    case NEW_COMMENT_RESET:
      return {
        ...state, success: false,
      };
    case NEW_COMMENT_FAIL:
      return {
        ...state, loading: false, error: true,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const savePostReducer = (state = {}, { type, payload }) => {
  switch (type) {
    case SAVE_UNSAVE_POST_REQUEST:
      return {
        ...state, loading: true,
      };
    case SAVE_UNSAVE_POST_SUCCESS:
      return {
        loading: false, success: payload.success, message: payload.message,
      };
    case SAVE_UNSAVE_POST_FAIL:
      return {
        ...state, loading: false, error: payload,
      };
    case SAVE_UNSAVE_POST_RESET:
      return {
        ...state, success: false, message: null,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: null,
      };
    default:
      return state;
  }
};

export const deletePostReducer = (state = { loading: false, success: false, error: false }, { type, payload }) => {
  switch (type) {
    case DELETE_POST_REQUEST:
      return {
        ...state, loading: true,
      };
    case DELETE_POST_SUCCESS:
      return {
        loading: false, success: payload,
      };
    case DELETE_POST_FAIL:
      return {
        ...state, loading: false, error: true,
      };
    case DELETE_POST_RESET:
      return {
        ...state, success: false, error: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: false,
      };
    default:
      return state;
  }
};

export const deleteTagReducer = (state = { loading: false, success: false, error: false }, { type }) => {
  switch (type) {
    case DELETE_TAG_REQUEST:
      return { loading: true };
    case DELETE_TAG_SUCCESS:
      return { loading: false, success: true };
    case DELETE_TAG_FAIL:
      return { loading: false, error: true };
    case DELETE_TAG_RESET:
      return {};
    default:
      return state;
  }
};

export const deleteCommentReducer = (state = { success: false, error: false }, { type }) => {
  switch (type) {
    case DELETE_COMMENT_SUCCESS:
      return { success: true };
    case DELETE_COMMENT_FAIL:
      return { error: true };
    case DELETE_COMMENT_RESET:
      return { success: false, error: false };
    case CLEAR_ERRORS:
      return { error: false };
    default:
      return state;
  }
};

export const actionsReducer = (state = { actions: [], error: false, success: false, loading: false }, {
  type, payload,
}) => {
  switch (type) {
    case ACTION_REQUEST:
      return {
        ...state, loading: true,
      };
    case ACTION_SUCCESS:
      let nextPage = undefined;
      if (payload.nextPageUrl) {
        const nextPageUrl = new URL(payload.nextPageUrl);
        const params = new URLSearchParams(nextPageUrl.search);
        nextPage = params.get('page');
      }
      return {
        ...state,
        loading: false,
        actions: [...state.actions, ...payload.actions],
        totalActions: payload.totalActions,
        nextActionPage: nextPage,
      };
    case ACTION_FAIL:
      return {
        ...state, loading: false, error: true,
      };
    case ACTION_RESET:
      return {
        ...state, actions: [], totalActions: 0,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: false,
      };
    default:
      return state;
  }
};

export const editPostReducer = (state = { error: false, success: false, loading: false }, {
  type,
}) => {
  switch (type) {
    case EDIT_POST_REQUEST:
      return {
        loading: true,
      };
    case EDIT_POST_SUCCESS:
      return {
        loading: false, success: true,
      };
    case EDIT_POST_FAIL:
      return {
        loading: false, error: true,
      };
    case EDIT_POST_RESET:
      return {
        success: false, loading: false, error: false,
      };
    case CLEAR_ERRORS:
      return {
        ...state, error: false,
      };
    default:
      return state;
  }
};
