import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DeviceNotice from './DeviceNotice';
import {deviceAllowed} from './device';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(deviceAllowed() ? <App /> : <DeviceNotice />);