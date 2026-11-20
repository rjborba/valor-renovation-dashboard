import { useRef, useState } from 'react';
import { TaskBoard } from '@valor/task-board';
import { Button } from '@valor/ui';
import TaskEditor from './TaskEditor';

export default function Standalone() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <main className="mx-auto grid max-w-md gap-4 p-6">
      <h1 className="text-xl font-semibold">Task editor</h1>
      <TaskBoard>
        {board => (
          <>
            <Button ref={trigger} onClick={() => { setOpen(true); setMessage(''); }}>Add task</Button>
            <p role="status">{message}</p>
            {open && <TaskEditor assignees={board.assignees} onSave={board.onAddTask}
              onClose={result => {
                setOpen(false);
                setMessage(result ?? '');
                requestAnimationFrame(() => trigger.current?.focus());
              }} />}
          </>
        )}
      </TaskBoard>
    </main>
  );
}
