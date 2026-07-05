import React from 'react';

const SimpleBuilder: React.FC = () => {
  return (
    <div className="h-full w-full bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">AI Website Builder</h1>
      <p className="text-lg">Test - If you can see this, the component is rendering!</p>
      <div className="mt-8 p-4 bg-gray-800 rounded">
        <p>This is a simple test component to verify rendering.</p>
      </div>
    </div>
  );
};

export default SimpleBuilder;