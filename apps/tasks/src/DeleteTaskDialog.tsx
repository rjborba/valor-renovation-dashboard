import { useRef, useState } from 'react';
import type { RenovationTask, TasksFeatureProps } from '@valor/contracts';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@valor/ui';

export default function DeleteTaskDialog({ task, removeTask, close }: {
  task: RenovationTask;
  removeTask: TasksFeatureProps['onRemoveTask'];
  close(message?: string): void;
}) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function cancel() {
    if (!pending.current) close();
  }

  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await removeTask(task.id);
      close('Task deleted.');
    } catch {
      pending.current = false;
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) cancel(); }}>
      <DialogContent showCloseButton={false}
        onOpenAutoFocus={event => { event.preventDefault(); cancelButton.current?.focus(); }}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Delete task</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">Permanently delete “{task.description}”?</DialogDescription>
        </DialogHeader>
        {failed && <p role="alert" className="text-sm text-destructive">The task could not be deleted. Try again.</p>}
        <DialogFooter>
          <Button ref={cancelButton} variant="outline" disabled={busy} onClick={cancel}>Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={remove}>{busy ? 'Deleting task…' : 'Delete task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
