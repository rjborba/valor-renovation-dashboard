import { lazy, Suspense, useState, type ComponentType } from 'react';
import type { TaskEditorProps } from '@valor/contracts';
import { Button, Dialog, DialogContent, DialogFooter, DialogTitle, FeatureBoundary } from '@valor/ui';
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

function EditorFallback({ onClose, retry }: { onClose: () => void; retry?: () => void }) {
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} aria-describedby={undefined}
        onCloseAutoFocus={event => event.preventDefault()}>
        <DialogTitle>Task editor</DialogTitle>
        {retry
          ? <p role="alert">The task editor could not load or display.</p>
          : <p role="status">Loading task editor…</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>Cancel</Button>
          {retry && <Button onClick={retry}>Retry editor</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FederatedTaskEditor(props: TaskEditorProps) {
  const [attempt, setAttempt] = useState(() => ({ id: 0, Editor: lazy(loadEditor) }));

  function retry() {
    needsRetry = true;
    editorModule = undefined;
    setAttempt(previous => ({ id: previous.id + 1, Editor: lazy(loadEditor) }));
  }

  const { Editor } = attempt;
  return (
    <FeatureBoundary key={attempt.id} fallback={<EditorFallback onClose={props.onClose} retry={retry} />}>
      <Suspense fallback={<EditorFallback onClose={props.onClose} />}>
        <Editor {...props} />
      </Suspense>
    </FeatureBoundary>
  );
}
