import React, { useEffect, useState } from 'react';
import axios from '../../../Routes/axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import SubmitButton from './SubmitButton';
import ClaimPointsButton from '../../Rewards/Buttons/ClaimPointsButton';

/**
 * This component renders a question to which the user needs to submit a text answer.
 * @param task - is the task object
 * @param {Boolean} taskSolved - true if the corresponding submission is marked as correct
 * @param {Boolean} rewardsClaimed - true if the reward for completing this task has been claimed by the user
 * @param {String} previousAnswer - if submission exists, the previous answer submitted
 * @param submission - the corresponding submission to track status
 */

const TextAnswerQuestion = ({
  task,
  taskSolved,
  rewardsClaimed,
  previousAnswer,
  submission,
}) => {
  const { t } = useTranslation();
  const [textAnswer, setTextAnswer] = useState(previousAnswer || '');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewed, setIsReviewed] = useState(null);
  const [isSolved, setIsSolved] = useState(taskSolved);
  const [isClaimed, setIsClaimed] = useState(rewardsClaimed);
  const [submissionId, setSubmissionId] = useState(submission?.id || '');

  useEffect(() => {
    setIsSolved(taskSolved);
    setTextAnswer(previousAnswer);
  }, [taskSolved]);

  useEffect(() => {
    setIsClaimed(rewardsClaimed);
  }, [rewardsClaimed]);

  // Function to handle the rewards claimed, gets passed to ClaimPointsButton
  const handleRewardsClaimed = () => {
    setIsClaimed(true);
  };

  useEffect(() => {
    if (typeof submission === 'undefined') {
      return;
    }

    if (submission.awarded_points > 0) {
      setIsClaimed(true);
    }

    if (submission && submission.id) {
      const submittedAnswer = submission.text_answer_submission?.answer || '';
      setTextAnswer(submittedAnswer);

      // Set status based on submission
      if (submission.correct) {
        setIsSubmitted(true);
        setIsReviewed(true);
        setIsSolved(true);
      } else if (!submission.reviewed) {
        setIsSubmitted(true);
        setIsReviewed(false);
      } else if (submission.reviewed) {
        setIsSubmitted(false);
        setIsReviewed(true);
      } else {
        setIsSubmitted(false);
        setIsReviewed(false);
      }
    }
  }, [submission, t]);

  const submitAnswer = async () => {
    if (typeof textAnswer === 'undefined' || !textAnswer.trim()) {
      toast.error(t('workbook_missing_answer'));
      return;
    }

    if (textAnswer.length < task.minimum_answer_length) {
      toast.info(t('workbook_answer_is_too_short'));
      return;
    }

    setIsSubmitted(true);
    setIsReviewed(false);

    try {
      const response = await axios.post(
        '/api/workbook/submissions/text-answer/',
        {
          task_id: task.id,
          answer: textAnswer,
        }
      );

      setSubmissionId(response.data.id);

      // Handle response to update state based on correctness and review status
      if (response.data.correct) {
        setIsReviewed(true);
        setIsSolved(true);
        toast.success(t('workbook_answer_submission'));
      } else if (!response.data.reviewed) {
        toast.success(t('workbook_answer_submission'));
      } else {
        setIsSubmitted(false); // Allow resubmission if incorrect
        toast.error(t('workbook_submission_incorrect'));
      }
    } catch (error) {
      setIsSubmitted(false); // Re-enable the button on error
      setIsReviewed(null);
      toast.error(t('workbook_submission_error'));
    }
  };

  // Render Button and Submission state
  const renderSubmissionState = () => {
    // Case 1: Task is solved
    if (isSolved) {
      return (
        <div className='flex flex-col items-center space-y-2'>
          <span className='text-green-800'>
            {t('workbook_submission_correct')}
          </span>
          <ClaimPointsButton
            amount={task.points}
            claimed={isClaimed}
            {...(!isClaimed && { submissionID: submissionId })}
            onClaimSuccess={handleRewardsClaimed}
          />
        </div>
      );
    }

    // Case 2: Task is submitted and waiting for review
    if (isSubmitted && !isReviewed) {
      return (
        <div className='flex flex-col items-center space-y-2'>
          <span className='text-orange-600'>
            {t('workbook_pending_review')}
          </span>
        </div>
      );
    }

    // Case 3: Task is reviewed, not solved and not submitted (show feedback and allow resubmission)
    if (isReviewed && !isSolved && !isSubmitted) {
      return (
        <div className='flex flex-col items-center mt-4 space-y-2'>
          <span className='text-red-600'>
            {t('workbook_submission_incorrect')}
          </span>
	  <SubmitButton onClick={submitAnswer} text={t('submit_button')} />
        </div>
      );
    }

    // Case 4: Task is not solved, not reviewed, and not submitted
    return (
      <div className='flex flex-col items-center mt-4 space-y-2'>
        <SubmitButton onClick={submitAnswer} text={t('submit_button')} />
      </div>
    );
  };

  // Final rendering based on renderSubmissionState
  return (
    <div className='bg-white space-y-2 p-4 rounded shadow'>
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

      <textarea
        value={textAnswer}
        onChange={(e) => setTextAnswer(e.target.value)}
        rows='5'
        className='block p-2 w-full text-sm bg-gray-100 rounded'
        placeholder={t('workbook_textarea_placeholder')}
        disabled={isSolved || isSubmitted}
      />

      {/* Render the feedback */}
      {submission?.feedback && (
        <div className='feedback'>
          <span className='font-bold'>{t('workbook_submission_feedback')}:</span>
          <textarea
            value={submission.feedback}
            rows='5'
            className='block p-2 mt-2 w-full text-sm bg-gray-100 rounded'
            disabled={true}
          />
        </div>
      )}

      {/* Display submit button and additional text, based submission state */}
      {renderSubmissionState()}
    </div>
  );
};

export default TextAnswerQuestion;
