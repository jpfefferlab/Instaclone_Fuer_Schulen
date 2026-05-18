import { useDispatch, useSelector } from 'react-redux';
import React from "react";
import NewsfeedAlgorithm from "../User/Settings/NewsfeedAlgorithm";
import {getNewsfeed} from "../../actions/postAction";
import {NEWSFEED_RESET} from "../../constants/postConstants";

const AlgorithmQuickSwitch = () => {
  const dispatch = useDispatch();


  const reloadNewsfeed = () => {
    dispatch(getNewsfeed());
    dispatch({ type: NEWSFEED_RESET });
  }

  return (
      <div className='px-4'>
        <NewsfeedAlgorithm onSaveHandler={reloadNewsfeed} small={true} />
      </div>
  );
};

export default AlgorithmQuickSwitch;
