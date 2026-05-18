import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { HelmetProvider } from 'react-helmet-async';
import { DevSupport } from '@react-buddy/ide-toolbox';
import { ComponentPreviews, useInitial } from './dev';

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <Router>
        <HelmetProvider>
          <DevSupport ComponentPreviews={ComponentPreviews}
                      useInitialHook={useInitial}
          >
            <App />
          </DevSupport>
        </HelmetProvider>
      </Router>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root'),
);
