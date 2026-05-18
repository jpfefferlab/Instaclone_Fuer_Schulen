import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from '../../Routes/axios';
import MultipleChoiceQuestion from './Tasks/MultipleChoiceQuestion';
import TextAnswerQuestion from './Tasks/TextAnswerQuestion';
import InteractiveTask from './Tasks/InteractiveTask';
import ContentBlock from './Tasks/ContentBlock';

/**
 * This component displays the Exercise title, tasks and other content
 * @param exercise the exercise object data passed on from Workbook
 */

const Exercise = ({ exercise }) => {
  const { t } = useTranslation();
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchUserSubmissions = async () => {
    try {
      //Pass current exercise ID to backend
      const response = await axios.get('/api/workbook/user-submissions', {
        params: { exercise_id: exercise.id },
      });
      const userSubmissions = response.data || [];

      // Map submissions by task ID
      if (userSubmissions.length === 0) {
        setSubmissions({});
      } else {
        const submissionMap = {};
        userSubmissions.forEach((submission) => {
          // Stores the entire submission object
          submissionMap[submission.task] = submission;
        });
        setSubmissions(submissionMap);
      }

      setLoading(false);
    } catch (error) {
      toast.error(t('workbook_fetch_submissions_error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wait for exercise data to be loaded
    if (!exercise) {
      return;
    }
    fetchUserSubmissions();
  }, [exercise]);

  if (loading) {
    return <div>{t('workbook_exercise_loading')}</div>;
  }

  // Orders tasks and content blocks (images and texts between them) by the "order" field
  const orderedContent = (exercise.tasks || []).sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className='flex flex-col overflow-auto p-4'>
      <h1 className='text-xl sm:text-2xl ml-2 mb-4 font-bold text-center'>
        {exercise.title}
      </h1>
      <div className='my-2 space-y-4'>
        {/* task objects */}
        {orderedContent.map((item) => {
          // Check if it is an actual Task and render it based on type (content blocks dont have type field)
          if (item.type) {
            // Submission for current task, undefined if no submission
            const submission = submissions[item.id];
            // Checks if the task is solved
            const isSolved = submission?.correct || false;
            // Cheks if the rewards have been claimed
            const isClaimed = !!submission && submission?.awarded_points > 0;

            // Build Task based on type
            switch (item.type) {
              case 'MULTIPLE_CHOICE':
                return (
                  <MultipleChoiceQuestion
                    key={item.id}
                    task={item}
                    taskSolved={isSolved}
                    rewardsClaimed={isClaimed}
                    submission={submission}
                  />
                );
              case 'TEXT_ANSWER':
                return (
                  <TextAnswerQuestion
                    key={item.id}
                    task={item}
                    taskSolved={isSolved}
                    rewardsClaimed={isClaimed}
                    previousAnswer={submission?.text_answer_submission?.text}
                    submission={submission}
                  />
                );
              case 'INTERACTIVE':
                return (
                  <InteractiveTask
                    key={item.id}
                    task={item}
                    taskSolved={isSolved}
                    rewardsClaimed={isClaimed}
                    submission={submission}
                  />
                );
              case 'CONTENT':
                return <ContentBlock key={item.id} content={item} />;
              default:
                return (
                  <p key={item.id}>
                    {t('workbook_unrecognized_task_type')} {item.type}
                  </p>
                );
            }
          } else {
            return (
              <p key={item.id}>
                {t('workbook_unrecognized_task_type')} {item.type}
              </p>
            );
          }
        })}
      </div>
    </div>
  );
};

export default Exercise;
