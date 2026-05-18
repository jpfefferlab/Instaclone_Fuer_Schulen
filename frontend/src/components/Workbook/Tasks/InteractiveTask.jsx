import React, { useEffect, useState } from 'react';
import axios from '../../../Routes/axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import SubmitButton from './SubmitButton';
import TaskProgressBar from './TaskProgressBar';
import ClaimPointsButton from '../../Rewards/Buttons/ClaimPointsButton';

/**
 * Component for Interactive Task.
 * When started, listens to backend signals and displays the task progress.
 * @param task - is the task object
 * @param {Boolean} taskSolved - true if the corresponding submission is marked as correct
 * @param {Boolean} rewardsClaimed - true if the reward for completing this task has been claimed by the user
 * @param submission - the corresponding submission to track status
 */
const InteractiveTask = ({ task, taskSolved, rewardsClaimed, submission }) => {
  const { t } = useTranslation();

  const [currentCount, setCurrentCount] = useState(
    submission?.interactive_submission?.current_count || 0
  );
  const [isPending, setIsPending] = useState(false);
  const [isSolved, setIsSolved] = useState(taskSolved);
  const [isClaimed, setIsClaimed] = useState(rewardsClaimed);
  const [submissionId, setSubmissionId] = useState(submission?.id || '');

  useEffect(() => {
    if (submission && submission.interactive_submission) {
      setCurrentCount(submission.interactive_submission.current_count);
      setIsPending(!submission.correct);
      setIsSolved(submission.correct);
      setSubmissionId(submission.id);
      if (submission.awarded_points > 0) {
        setIsClaimed(true);
      }
    }
  }, [submission]);

  // Function to handle the rewards claimed, gets passed to ClaimPointsButton
  const handleRewardsClaimed = () => {
    setIsClaimed(true);
  };

  const startTask = async () => {
    if (isSolved || isPending) return; // Prevent creating another submission if already solved or button is disabled

    // Check if the action type is valid
    // If not, the task can not be started
    const validActionTypes = [
      'CREATE_POST', 'LIKE_POST', 'COMMENT_POST', 'FOLLOW',
      'CREATE_STORY', 'CREATE_ADVERTISEMENT', 'EDIT_PROFILE'
    ];

    if (!validActionTypes.includes(task.action_type)) {
      toast.error(t('workbook_interactive_task_unrecognized_type'));
      return;
    }

    try {
      const response = await axios.post(
        '/api/workbook/submissions/interactive/',
        {
          task_id: task.id,
          action_type: task.action_type,
          target_count: task.target_count,
        }
      );

      // Update the frontend state
      setCurrentCount(0);
      setIsPending(true);
      setIsSolved(false);
    } catch (error) {
      toast.error(t('workbook_interactive_submission_error'));
    }
  };

  // Map action types to translation keys
  const taskTypeTranslations = {
    CREATE_POST: 'workbook_action_create_post',
    LIKE_POST: 'workbook_action_like_post',
    COMMENT_POST: 'workbook_action_comment_post',
    FOLLOW: 'workbook_action_follow',
    CREATE_STORY: 'workbook_action_create_story',
    CREATE_ADVERTISEMENT: 'workbook_action_create_advertisement',
    EDIT_PROFILE: 'workbook_action_edit_profile',
  };

  // Get translation key based on action type
  const translationKey =
    taskTypeTranslations[task.action_type] || '';

  // Render the button to start or claim rewards
  const renderButton = () => {
    return (
      <div className='flex flex-col items-center mt-4 space-y-2'>
        {isSolved && (
          <ClaimPointsButton
            amount={task.points}
            claimed={isClaimed}
            {...(!isClaimed && { submissionID: submissionId })}
            onClaimSuccess={handleRewardsClaimed}
          />
        )}

        {!isSolved && !isPending && (
          <SubmitButton
            onClick={startTask}
            text={t('workbook_interactive_task_start')}
          />
        )}
      </div>
    );
  };

  // Final rendering based on renderTaskState
  return (
    <div className='bg-white p-4 rounded shadow'>
      <h2 className='text-base font-bold mb-2'>{task.title && task.title}</h2>
      {/* Render the task upper text field using dangerouslySetInnerHTML */}
      <div
        className='task-upper-text text-justify'
        dangerouslySetInnerHTML={{ __html: task.upper_text }}
      />
      {task.image && (
        <img
          src={task.image}
          alt=''
          loading='lazy'
          className='w-full h-auto my-4'
        />
      )}
      {/* Render the task lower text field using dangerouslySetInnerHTML */}
      <div
        className='task-lower-text text-justify'
        dangerouslySetInnerHTML={{ __html: task.lower_text }}
      />

      {/* render TaskProgressBar and progress text if task started or completed */}
      {(isPending || isSolved) && (
        <>
          <TaskProgressBar
            currentCount={currentCount}
            targetCount={task.target_count}
          />
          <div className='flex justify-center'>
            <p>
              {t(translationKey)}: {currentCount} / {task.target_count}
            </p>
          </div>
        </>
      )}
      {/* start or rewards button */}
      {renderButton()}
    </div>
  );
};

export default InteractiveTask;
