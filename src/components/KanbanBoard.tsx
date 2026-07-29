import React from 'react';

export default function KanbanBoard() {
  return (
    <div style={{
      padding: '2rem',
      color: 'white',
      textAlign: 'center',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Kanban Board</h1>
      <p style={{ color: '#888' }}>Coming soon...</p>
    </div>
  );
}