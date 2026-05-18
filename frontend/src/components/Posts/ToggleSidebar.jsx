import React, {useState} from "react";
import { Resizable } from 're-resizable';
import {useTranslation} from "react-i18next";

const ToggleSidebar = ({ children, position = 'left', smallHint = "Test", styles, openWidth = 550, openHeight = 500}) => {
    const { t } = useTranslation();

    const [sidebareOpen, setSidebarOpen] = useState(false);

    const toggleChartVisibility = () => {
        setSidebarOpen(!sidebareOpen);
    }

  return (

      <div className='fixed bottom-0 z-100 overflow-hidden'>
          {!sidebareOpen &&
              <div className={"fixed bottom-0 bg-white z-100 border rounded bg-white shadow-md text-right px-5 py-2" + " " + (position === 'left' ? 'left-0' : 'right-0')}>
                  <a href="#" className="text-gray-700 hover:underline" onClick={() => {
                      toggleChartVisibility()
                  }}>
                      {smallHint}
                  </a>
              </div>
          }
          <div className={"bottom-0 top-0 bg-white z-100 border-l border-r shadow-md h-full w-full sm:w-3/4 md:w-2/3 lg:w-2/3 xl:w-1/2 2xl:w-2/5" + " " + (sidebareOpen ? 'fixed' : 'hidden')  + " " + (position === 'left' ? 'left-0' : 'right-0')}>
              <div className="relative overflow-scroll h-full overflow-y-scroll">
                  <div>
                      {sidebareOpen &&
                          <div className="text-right px-5 py-2 border-b mb-2">
                              <a href="#" className="text-gray-700 hover:underline" onClick={() => {
                                  toggleChartVisibility();
                              }}>
                                  {t('close')}
                              </a>
                          </div>
                      }

                      {children}
                  </div>
              </div>
            </div>
      </div>
  );
};

export default ToggleSidebar;
