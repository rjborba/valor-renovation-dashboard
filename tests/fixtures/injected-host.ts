import type { RenovationTask } from '@valor/contracts';
import type { TaskRepository } from '@valor/contracts/storage';

let rows: readonly RenovationTask[] = [{
  id: 'memory-only',
  description: 'Inspect the injected board',
  status: 'Open',
  dueDate: '2027-04-10',
  assignees: ['Inspector'],
}];

const repository: TaskRepository = {
  async list() { return rows; },
  async add(task) { return rows = [task, ...rows]; },
  async update(task) { return rows = rows.map(row => row.id === task.id ? task : row); },
  async remove(id) { return rows = rows.filter(row => row.id !== id); },
};

async function mount() {
  const [{ createRoot }, { createElement }, { default: App }] = await Promise.all([
    import('react-dom/client'), import('react'), import('../../apps/dashboard/src/App'),
  ]);
  createRoot(document.getElementById('root')!).render(createElement(App, { repository }));
}

void mount();
