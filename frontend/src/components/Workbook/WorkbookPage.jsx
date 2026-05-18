import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import axios from '../../Routes/axios';
import { toast } from 'react-toastify';
import {
  fetchWorkbookSections,
  clearErrors,
} from '../../actions/workbookAction';
import Exercise from './Exercise';
import WorkbookSidebar from './WorkbookSidebar';
import TocOutlinedIcon from '@mui/icons-material/TocOutlined';

const WorkbookPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { loading, error, sections } = useSelector(
    (state) => state.workbookSections
  );
  const storedExerciseId = localStorage.getItem('selectedExercise');
  const [selectedExerciseId, setSelectedExerciseId] = useState(storedExerciseId || null);
  const [selectedExerciseData, setSelectedExerciseData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(null);

  useEffect(() => {
    dispatch(fetchWorkbookSections());

    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
  }, [dispatch, error]);

  // On entering the page, show the previously selected exercise
  // If the user opens the workbook the frist time, show the first section and exercise
  useEffect(() => {
    if (!selectedExerciseId && sections && sections.length > 0) {
      const firstSection = sections[0];
      if (firstSection.exercises && firstSection.exercises.length > 0) {
        setSelectedExerciseId(firstSection.exercises[0].id);
      }
    }
  }, [sections, selectedExerciseId]);

  // Gets the contents of the selected exercise, whenever the selected exercise id changes
  useEffect(() => {
    if (selectedExerciseId) {
      const fetchExerciseData = async () => {
        try {
          const { data } = await axios.get(
            `api/workbook/exercises/${selectedExerciseId}/`
          );
          setSelectedExerciseData(data);
        } catch (err) {
          toast.error(t('workbook_load_exercise_error'));
        }
      };
      fetchExerciseData();
    } else {
      // Reset exercise data if no exercise is selected
      setSelectedExerciseData(null);
    }
  }, [selectedExerciseId]);

  const handleExerciseSelect = (exerciseId) => {
    setSelectedExerciseId(exerciseId);
    localStorage.setItem('selectedExercise', exerciseId);
  };

  // If there are no sections or exercises, either loading or empty
  if (!sections || sections.length === 0) {
    if (loading) {
      return <div>{t('workbook_page_loading')}</div>;
    }
    return <div>{t('workbook_empty_placeholder')}</div>;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className='flex min-h-[calc(100vh-4rem)]'>
      <button
        className='fixed t-16 l-2 m-2 z-10 p-2 bg-gray-200 rounded-full shadow-md'
        onClick={toggleSidebar}
      >
        <TocOutlinedIcon />
      </button>
      <aside className={`w-80 fixed t-16 h-[calc(100vh-7rem)] overflow-auto ${
        isSidebarOpen ? 'block' : 'hidden'}`}>
        {/* sidebar menu */}

        <WorkbookSidebar
          sections={sections}
          onExerciseSelect={handleExerciseSelect}
          selectedExerciseId={selectedExerciseId}
        />
      </aside>
      <main className='flex-1 justify-center ml-0 sm:ml-80 p-4 overflow-auto max-w-3xl sm:max-w-lg md:max-w-2xl'>
        {selectedExerciseId ? (
          <Exercise exercise={selectedExerciseData} />
        ) : (
          <div>{t('workbook_choose_exercise')}</div>
        )}
      </main>
    </div>
  );
};

export default WorkbookPage;
