import { createRoot } from 'react-dom/client';
import Standalone from './Standalone';

const container = document.getElementById('root');
if (!container) throw new Error('Missing application root');
createRoot(container).render(<Standalone />);
