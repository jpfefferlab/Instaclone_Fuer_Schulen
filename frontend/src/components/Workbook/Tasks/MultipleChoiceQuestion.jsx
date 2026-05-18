import React, { useEffect, useState } from 'react';
import axios from '../../../Routes/axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import SubmitButton from './SubmitButton';
import ClaimPointsButton from '../../Rewards/Buttons/ClaimPointsButton';

/**
 * This component renders a multiple choice question with options and submit.
 * @param task - is the task object
 * @param {Boolean} taskSolved - true if the corresponding submission is marked as correct
 * @param {Boolean} rewardsClaimed - true if the reward for completing this task has been claimed by the user
 * @param submission - the corresponding submission to track status
 */

const MultipleChoiceQuestion = ({
  task,
  taskSolved,
  rewardsClaimed,
  submission,
}) => {
  const { t } = useTranslation();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isReviewed, setIsReviewed] = useState(null);
  const [isSolved, setIsSolved] = useState(taskSolved);
  const [isClaimed, setIsClaimed] = useState(rewardsClaimed);
  const [submissionId, setSubmissionId] = useState(submission?.id || '');

  useEffect(() => {
    setIsSolved(taskSolved); // Update local state when taskSolved changes
    if (taskSolved) {
      const correctOptions = task.options
        .filter((option) => option.isCorrect)
        .map((option) => option.id);
      setSelectedOptions(correctOptions);
    }
  }, [taskSolved, task.options]);

  useEffect(() => {
    setIsClaimed(rewardsClaimed);
  }, [rewardsClaimed]);

  // Function to handle the rewards claimed, gets passed to ClaimPointsButton
  const handleRewardsClaimed = () => {
    setIsClaimed(true);
  };

  // If there's a submission, set the selected options accordingly
  useEffect(() => {
    if (typeof submission === 'undefined') {
      return;
    }

    if (submission.awarded_points > 0) {
      setIsClaimed(true);
    }

    if (submission && submission.id) {
      setSelectedOptions(submission.multiple_choice_submission?.choices || []);
      setIsReviewed(submission.reviewed);
      setIsSolved(submission.correct);
    }
  }, [submission, t]);

  const handleOptionChange = (optionId) => {
    if (isSolved || isSubmitted) return;

    if (selectedOptions.includes(optionId)) {
      setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
    } else {
      setSelectedOptions([...selectedOptions, optionId]);
    }
  };

  const submitChoices = async () => {
    if (selectedOptions.length === 0) {
      toast.error(t('workbook_no_options_chosen'));
      return;
    }

    setIsSubmitted(true); // Temporarily disable the button after submission

    try {
      const response = await axios.post(
        '/api/workbook/submissions/multiple-choice/',
        {
          task_id: task.id,
          choices: selectedOptions,
        }
      );

      setSubmissionId(response.data.id);
      setIsReviewed(true);

      // Response tells if the submission was correct or incorrect
      if (response.data.correct) {
        setIsSolved(true); // Mark the task as solved if correct
        toast.success(t('workbook_answer_submission'));
      } else {
        setIsSubmitted(false); // Allow resubmission if incorrect
        toast.error(t('workbook_submission_incorrect'));
      }
    } catch (error) {
      toast.error(t('workbook_submission_error'));
      setSubmissionStatus(t('workbook_submission_error'));
      setIsReviewed(false);
      setIsSubmitted(false); // Re-enable the button on error
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

    // Case 3: Options were not correct (allow resubmission)
    if (isReviewed && !isSolved && !isSubmitted) {
      return (
        <div className='flex flex-col items-center mt-4 space-y-2'>
          <span className='text-red-600'>
            {t('workbook_submission_incorrect')}
          </span>
          <SubmitButton onClick={submitChoices} text={t('submit_button')} />
        </div>
      );
    }

    // Case 4: Task is not solved, not reviewed, and not submitted
    return (
      <div className='flex flex-col items-center mt-4 space-y-2'>
        <SubmitButton onClick={submitChoices} text={t('submit_button')} />
      </div>
    );
  };

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
          className='w-full h-auto mb-4'
        />
      )}
      {/* Render the task lower text field using dangerouslySetInnerHTML */}
      <div
        className='task-lower-text mb-4 text-justify'
        dangerouslySetInnerHTML={{ __html: task.lower_text }}
      />

      {/* Render the multiple choice options */}
      {task.options.map((option) => (
        <div key={option.id} className='mb-4 space-y-1'>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={selectedOptions.includes(option.id)}
              onChange={() => handleOptionChange(option.id)}
              disabled={isSolved || isSubmitted} // Disable if solved or in the process of submitting
              className='mr-2'
            />
            {/* Get localized option text */}
            {option.option}
          </label>
        </div>
      ))}

      {/* Display submit button and additional text, based submission state */}
      {renderSubmissionState()}
    </div>
  );
};

export default MultipleChoiceQuestion;
