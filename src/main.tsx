import {createRoot} from 'react-dom/client';
import CloakConsole from './CloakConsole.tsx';
import './console.css';

createRoot(document.getElementById('root')!).render(<CloakConsole />);
