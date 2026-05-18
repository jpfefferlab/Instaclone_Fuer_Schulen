import React from 'react';

/**
 * This simple component  just displays the contents of a CONTENT type task.
 */

const ContentBlock = ({ content }) => {
  return (
    <div className='p-4 rounded'>
      <h2 className='text-base font-bold mb-2'>
        {content.title && content.title}
      </h2>
      {/* Render the upper text field using dangerouslySetInnerHTML */}
      <div
        className='content-upper-text text-justify'
        dangerouslySetInnerHTML={{ __html: content.upper_text }}
      />
      {/* Content image */}
      {content.image && (
        <img src={content.image} alt='' className='w-full h-auto my-4' />
      )}
      {/* Render the lower text field using dangerouslySetInnerHTML */}
      <div
        className='content-lower-text text-justify'
        dangerouslySetInnerHTML={{ __html: content.lower_text }}
      />
    </div>
  );
};

export default ContentBlock;
