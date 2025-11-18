/**
 * Quick test entry point - add this to your App.js temporarily
 * Just add: import MultiAgentTest from './TestMultiAgent';
 * And render: <MultiAgentTest /> somewhere in your app
 */

import React from 'react';
import MultiAgentTest from './components/Test/MultiAgentTest';

const TestMultiAgent = () => {
  return (
    <div style={{ padding: '20px' }}>
      <MultiAgentTest />
    </div>
  );
};

export default TestMultiAgent;