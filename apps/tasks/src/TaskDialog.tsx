import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { normalizeAssignees, taskStatuses, type RenovationTask, type TaskStatus } from '@valor/contracts';

export type TaskAction =
  | { kind: 'add' }
  | { kind: 'edit' | 'delete'; task: RenovationTask };

function TaskFields({
  task,
  assignees,
  busy,
  save,
  cancel,
  error,
}: {
  task?: RenovationTask;
  assignees: readonly string[];
  busy: boolean;
  save: (task: RenovationTask) => void;
  cancel: () => void;
  error: string;
}) {
  const descriptionId = useId();
  const dueDateId = useId();
  const statusId = useId();
  const newAssigneeId = useId();
  const assigneeErrorId = useId();
  const newId = useRef<string | null>(null);
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const assigneeInput = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'Open');
  const [selected, setSelected] = useState<readonly string[]>(task?.assignees ?? []);
  const [customAssignees, setCustomAssignees] = useState<string[]>([]);
  const [newAssignee, setNewAssignee] = useState('');
  const [assigneeError, setAssigneeError] = useState(false);
  const choices = normalizeAssignees([...customAssignees, ...assignees, ...(task?.assignees ?? [])]);

  function setAssigneeChecked(name: string, checked: boolean) {
    setSelected((current) => checked
      ? normalizeAssignees([...current, name])
      : current.filter((candidate) => candidate.toLowerCase() !== name.toLowerCase()));
    setAssigneeError(false);
  }

  function addAssignee() {
    const name = newAssignee.trim();
    if (!name) return;
    const existing = choices.find((choice) => choice.toLowerCase() === name.toLowerCase());
    if (!existing) setCustomAssignees((current) => [name, ...current]);
    setAssigneeChecked(existing ?? name, true);
    setNewAssignee('');
    assigneeInput.current?.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const summary = description.trim();
    if (!summary) {
      descriptionInput.current?.setCustomValidity('Enter a task description.');
      descriptionInput.current?.reportValidity();
      return;
    }

    const pendingName = newAssignee.trim();
    const existing = choices.find((name) => name.toLowerCase() === pendingName.toLowerCase());
    const owners = normalizeAssignees([...selected, existing ?? pendingName]);
    if (!owners.length) {
      setAssigneeError(true);
      assigneeInput.current?.focus();
      return;
    }

    save({
      id: task?.id ?? (newId.current ??= crypto.randomUUID()),
      description: summary,
      dueDate,
      status,
      assignees: owners,
    });
  }

  return (
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset className="task-board__form-fields" disabled={busy}>
        <div className="task-board__field">
          <label htmlFor={descriptionId}>Description</label>
          <textarea
            ref={descriptionInput}
            id={descriptionId}
            rows={3}
            value={description}
            onChange={(event) => {
              event.currentTarget.setCustomValidity('');
              setDescription(event.currentTarget.value);
            }}
            data-initial-focus
            required
          />
        </div>

        <div className="task-board__form-columns">
          <div className="task-board__field">
            <label htmlFor={dueDateId}>Promised due date</label>
            <input
              id={dueDateId}
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={dueDate}
              onChange={(event) => setDueDate(event.currentTarget.value)}
              required
            />
          </div>
          <div className="task-board__field">
            <label htmlFor={statusId}>Status</label>
            <select
              id={statusId}
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value as TaskStatus)}
            >
              {taskStatuses.map((choice) => <option key={choice}>{choice}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="task-board__assignees" aria-describedby={assigneeError ? assigneeErrorId : undefined}>
          <legend>Assignees</legend>
          {choices.length > 0 && (
            <div className="task-board__assignee-options">
              {choices.map((name) => (
                <label key={name} className="task-board__choice">
                  <input
                    type="checkbox"
                    checked={selected.some((assignee) => assignee.toLowerCase() === name.toLowerCase())}
                    onChange={(event) => setAssigneeChecked(name, event.currentTarget.checked)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="task-board__new-assignee">
            <div className="task-board__field">
              <label htmlFor={newAssigneeId}>New assignee</label>
              <input
                ref={assigneeInput}
                id={newAssigneeId}
                type="text"
                placeholder="Name or trade"
                value={newAssignee}
                aria-describedby={assigneeError ? assigneeErrorId : undefined}
                onChange={(event) => {
                  setNewAssignee(event.currentTarget.value);
                  setAssigneeError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    addAssignee();
                  }
                }}
              />
            </div>
            <button type="button" disabled={!newAssignee.trim()} onClick={addAssignee}>Add assignee</button>
          </div>
          {assigneeError && <p id={assigneeErrorId} className="task-board__error" role="alert">Choose or add at least one assignee.</p>}
        </fieldset>
      </fieldset>

      {error && <p className="task-board__error" role="alert">{error}</p>}
      <div className="task-board__dialog-actions">
        <button type="button" onClick={cancel} disabled={busy}>Cancel</button>
        <button type="submit" className="task-board__primary" disabled={busy}>
          {busy ? 'Saving task…' : task ? 'Save changes' : 'Add task'}
        </button>
      </div>
    </form>
  );
}

export default function TaskDialog({
  action,
  assignees,
  addTask,
  updateTask,
  removeTask,
  close,
}: {
  action: TaskAction;
  assignees: readonly string[];
  addTask: (task: RenovationTask) => Promise<void>;
  updateTask: (task: RenovationTask) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  close: (message?: string) => void;
}) {
  const headingId = useId();
  const confirmationId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const kind = action.kind;
  const title = kind === 'delete' ? 'Delete task' : kind === 'edit' ? 'Edit task' : 'Add task';

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    return () => dialog.close();
  }, []);

  function cancel() {
    if (!pending.current) close();
  }

  async function submit(change: () => Promise<void>, message: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await change();
      close(message);
    } catch {
      setError(kind === 'delete'
        ? 'The task could not be deleted. Try again.'
        : 'The task could not be saved. Try again.');
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="task-board__dialog"
      aria-labelledby={headingId}
      aria-describedby={kind === 'delete' ? confirmationId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
    >
      <h3 id={headingId}>{title}</h3>
      {kind === 'delete' ? (
        <div aria-busy={busy}>
          <p id={confirmationId}>Permanently delete “{action.task.description}”?</p>
          {error && <p className="task-board__error" role="alert">{error}</p>}
          <div className="task-board__dialog-actions">
            <button type="button" disabled={busy} data-initial-focus onClick={cancel}>Cancel</button>
            <button
              type="button"
              className="task-board__danger"
              disabled={busy}
              onClick={() => void submit(() => removeTask(action.task.id), 'Task deleted.')}
            >
              {busy ? 'Deleting task…' : 'Delete task'}
            </button>
          </div>
        </div>
      ) : (
        <TaskFields
          task={kind === 'edit' ? action.task : undefined}
          assignees={assignees}
          busy={busy}
          error={error}
          cancel={cancel}
          save={(task) => {
            if (kind === 'edit') void submit(() => updateTask(task), 'Task updated.');
            else void submit(() => addTask(task), 'Task added.');
          }}
        />
      )}
    </dialog>
  );
}
