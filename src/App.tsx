import { useAppStore } from './context/useAppStore';
import { RoleSelection } from './components/RoleSelection';
import { StudentView } from './pages/StudentView';
import { AdminView } from './pages/AdminView';

function App() {
  const role = useAppStore((state) => state.role);

  if (role === 'student') {
    return <StudentView />;
  }

  if (role === 'admin') {
    return <AdminView />;
  }

  return <RoleSelection />;
}

export default App;
