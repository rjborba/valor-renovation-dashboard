import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { localDateKey, normalizeAssignees, taskStatuses, type RenovationTask, type TaskStatus, type TaskEditorProps } from '@valor/contracts';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Textarea,
} from '@valor/ui';
import '@valor/ui/styles.css';

function TaskFields({
  task,
  assignees,
  descriptionInput,
  busy,
  save,
  cancel,
  error,
}: {
  task?: RenovationTask;
  assignees: readonly string[];
  descriptionInput: RefObject<HTMLTextAreaElement | null>;
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
  const assigneeInput = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(() => task?.dueDate ?? localDateKey(new Date()));
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
      <fieldset className="grid min-w-0 gap-3" disabled={busy}>
        <div className="grid min-w-0 gap-1.5">
          <Label htmlFor={descriptionId}>Description</Label>
          <Textarea
            ref={descriptionInput}
            id={descriptionId}
            className="field-sizing-fixed resize-y"
            rows={3}
            value={description}
            onChange={(event) => {
              event.currentTarget.setCustomValidity('');
              setDescription(event.currentTarget.value);
            }}
            required
          />
        </div>

        <div className="grid gap-3 min-[27rem]:grid-cols-2">
          <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={dueDateId}>Promised due date</Label>
            <Input
              id={dueDateId}
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={dueDate}
              onChange={(event) => setDueDate(event.currentTarget.value)}
              required
            />
          </div>
          <div className="grid min-w-0 gap-1.5 [&>[data-slot=native-select-wrapper]]:w-full">
            <Label htmlFor={statusId}>Status</Label>
            <NativeSelect
              id={statusId}
              value={status}
              onChange={(event) => setStatus(event.currentTarget.value as TaskStatus)}
            >
              {taskStatuses.map((choice) => <NativeSelectOption key={choice}>{choice}</NativeSelectOption>)}
            </NativeSelect>
          </div>
        </div>

        <fieldset className="min-w-0 space-y-2 rounded-md border p-2.5" aria-describedby={assigneeError ? assigneeErrorId : undefined}>
          <legend className="px-1 text-sm font-medium">Assignees</legend>
          {choices.length > 0 && (
            <div className="grid max-h-44 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-1.5 overflow-auto p-1">
              {choices.map((name) => (
                <Label
                  key={name}
                  className="min-h-9 min-w-0 cursor-pointer gap-2 rounded-md border px-2 py-1.5 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-accent"
                >
                  <Checkbox
                    checked={selected.some((assignee) => assignee.toLowerCase() === name.toLowerCase())}
                    disabled={busy}
                    onCheckedChange={(checked) => setAssigneeChecked(name, checked === true)}
                  />
                  <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
                </Label>
              ))}
            </div>
          )}
          <div className="grid items-end gap-2 min-[27rem]:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid min-w-0 gap-1.5">
              <Label htmlFor={newAssigneeId}>New assignee</Label>
              <Input
                ref={assigneeInput}
                id={newAssigneeId}
                type="text"
                placeholder="Name or trade"
                value={newAssignee}
                aria-describedby={assigneeError ? assigneeErrorId : undefined}
                aria-invalid={assigneeError || undefined}
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
            <Button type="button" variant="outline" className="justify-self-start" disabled={!newAssignee.trim()} onClick={addAssignee}>
              Add assignee
            </Button>
          </div>
          {assigneeError && <p id={assigneeErrorId} className="text-sm text-destructive" role="alert">Choose or add at least one assignee.</p>}
        </fieldset>
      </fieldset>

      {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      <DialogFooter className="mt-4 flex-row flex-wrap justify-end border-t pt-3">
        <Button type="button" variant="outline" onClick={cancel} disabled={busy}>Cancel</Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving task…' : task ? 'Save changes' : 'Add task'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function TaskEditor({ task, assignees, onSave, onClose }: TaskEditorProps) {
  const descriptionInput = useRef<HTMLTextAreaElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function cancel() {
    if (!pending.current) onClose();
  }

  async function save(draft: RenovationTask) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onSave(draft);
      onClose(task ? 'Task updated.' : 'Task added.');
    } catch {
      setError('The task could not be saved. Try again.');
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) cancel(); }}>
      <DialogContent
        className="max-h-[calc(100dvh-1.5rem)] gap-3 overflow-x-hidden overflow-y-auto overscroll-contain border-2 border-violet-500 bg-card p-4 sm:p-5"
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={event => { event.preventDefault(); descriptionInput.current?.focus(); }}
        onCloseAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
      >
        <DialogHeader className="text-left">
          <span className="w-fit rounded bg-violet-50 px-2 py-1 text-[11px] text-violet-800">
            Federated module <code>editor/TaskEditor</code>
          </span>
          <DialogTitle asChild><h3>{task ? 'Edit task' : 'Add task'}</h3></DialogTitle>
        </DialogHeader>
        <TaskFields task={task} assignees={assignees} descriptionInput={descriptionInput}
          busy={busy} error={error} cancel={cancel} save={save} />
      </DialogContent>
    </Dialog>
  );
}
