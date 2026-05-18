import React from 'react';
import { useTranslation } from 'react-i18next';

const WorkbookSidebar = ({
  sections,
  onExerciseSelect,
  selectedExerciseId,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className='flex flex-col m-0 pl-4 pt-12 bg-gray-300 shadow-lg'>
        {/* Sections start here */}
        {sections &&
          sections.map((section, index) => {
            const isSectionSelected = section.exercises.some(
              (exercise) => String(exercise.id) === String(selectedExerciseId)
            );

            return (
              <div key={section.id || index} className='mb-6'>
                <h2
                  className={`text-sm font-bold mb-1 sm:text-xl sm:mb-2 ${
                    isSectionSelected ? 'text-primary-blue' : 'text-black'
                  }`}
                >
                  {t('workbook_section')} {index}: {section.title}
                </h2>
                <hr className='border-gray-600 mt-1 mb-1 sm:mt-2 sm:mb-2' />
                <ul>
                  {section.exercises.map((exercise, exIndex) => {
                    const isSelected = String(exercise.id) === String(selectedExerciseId);

                    return (
                      <li
                        key={exercise.id || exIndex}
                        className='text-xs mb-1 pl-2 sm:text-base sm:mb-2 sm:pl-4'
                      >
                        <button
                          onClick={() => onExerciseSelect(exercise.id)}
                          className={`cursor-pointer ${
                            isSelected
                              ? 'text-primary-blue font-bold'
                              : 'text-black'
                          }`}
                        >
                          {t('workbook_exercise')} {exIndex + 1}:{' '}
                          {exercise.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
    </div>
  );
};

export default WorkbookSidebar;
