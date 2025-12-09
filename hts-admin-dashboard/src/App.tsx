import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeDetail from './components/EmployeeDetail';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<'dashboard' | 'detail'>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div>
      {view === 'dashboard' && (
        <Dashboard onSelect={(id) => { setSelectedId(id); setView('detail'); }} />
      )}
      {view === 'detail' && selectedId && (
        <EmployeeDetail id={selectedId} onBack={() => setView('dashboard')} />
      )}
    </div>
  );
}

export default App;
