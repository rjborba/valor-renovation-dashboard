import { useEffect, useState, type ComponentType } from 'react';
import type { TaskEditorProps } from '@valor/contracts';
import { Button, Dialog, DialogContent, DialogFooter, DialogTitle } from '@valor/ui';
import { retryRemote } from '../../../config/retryRemote';

type EditorModule = { default: ComponentType<TaskEditorProps> };
let editorModule: Promise<EditorModule> | undefined;
let needsRetry = false;

function loadEditor() {
  editorModule ??= (needsRetry
    ? retryRemote<EditorModule>('tasks', 'editor/TaskEditor')
    : import('editor/TaskEditor')
  ).catch(error => {
    needsRetry = true;
    editorModule = undefined;
    throw error;
  });
  return editorModule;
}

export default function FederatedTaskEditor(props: TaskEditorProps) {
  const [Editor, setEditor] = useState<ComponentType<TaskEditorProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadEditor().then(
      module => { if (active) setEditor(() => module.default); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [attempt]);

  if (Editor) return <Editor {...props} />;

  return (
    <Dialog open onOpenChange={open => { if (!open) props.onClose(); }}>
      <DialogContent showCloseButton={false} aria-describedby={undefined}
        onCloseAutoFocus={event => event.preventDefault()}>
        <DialogTitle>Task editor</DialogTitle>
        {failed
          ? <p role="alert">The task editor could not load.</p>
          : <p role="status">Loading task editor…</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onClose()}>Cancel</Button>
          {failed && <Button onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry editor</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
