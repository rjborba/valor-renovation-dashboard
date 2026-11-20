import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { formatBRL, type Purchase, type PurchaseItem } from '@valor/contracts';

export type PurchaseAction =
  | { kind: 'add'; save: (purchase: Purchase) => Promise<void> }
  | {
      kind: 'edit';
      purchase: Purchase;
      save: (purchase: Purchase) => Promise<void>;
    }
  | {
      kind: 'delete';
      purchase: Purchase;
      remove: (id: string) => Promise<void>;
    };

function textValue(value: FormDataEntryValue | null): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Complete each required field before saving.');
  return text;
}

function cents(value: FormDataEntryValue | null): number {
  const amount = textValue(value);
  if (!/^\d+(\.\d{1,2})?$/.test(amount))
    throw new Error('Enter amounts with up to two decimal places.');
  const [units, fraction = ''] = amount.split('.');
  const result = Number(units + fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('Amount is too large.');
  return result;
}

function defaultDate() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function PurchaseDialog({
  action,
  rooms,
  suppliers,
  close,
}: {
  action: PurchaseAction;
  rooms: readonly string[];
  suppliers: readonly string[];
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const original = action.kind === 'add' ? undefined : action.purchase;
  const [lines, setLines] = useState(() =>
    (original?.items ?? []).map((item, key) => ({ key, item })),
  );
  const nextKey = useRef(lines.length);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      if (action.kind === 'delete') {
        await action.remove(action.purchase.id);
      } else {
        const items = lines.map(
          ({ key }): PurchaseItem => ({
            name: textValue(data.get('name-' + key)),
            quantity: Number(textValue(data.get('qty-' + key))),
            unitPriceCents: cents(data.get('price-' + key)),
          }),
        );
        await action.save({
          id: original?.id ?? crypto.randomUUID(),
          date: textValue(data.get('date')),
          description: textValue(data.get('description')),
          supplier: textValue(data.get('supplier')),
          room: textValue(data.get('room')),
          paidCents: cents(data.get('paid')),
          discountCents: cents(data.get('discount') || '0'),
          items,
        });
      }
      close();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not save this change. Please try again.',
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const title =
    action.kind === 'delete'
      ? 'Delete purchase'
      : action.kind === 'edit'
        ? 'Edit purchase'
        : 'Add purchase';
  return (
    <dialog
      ref={dialog}
      className="purchase-dialog"
      aria-labelledby={formId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy.current) close();
      }}
    >
      <form onSubmit={submit}>
        <h2 id={formId}>{title}</h2>
        {action.kind === 'delete' ? (
          <p>
            Remove <strong>{action.purchase.description}</strong> (
            {formatBRL(action.purchase.paidCents)}) from your ledger?
          </p>
        ) : (
          <fieldset disabled={saving} className="purchase-fields">
            <label className="wide">
              Description
              <input
                name="description"
                required
                defaultValue={original?.description}
              />
            </label>
            <label>
              Date
              <input
                name="date"
                type="date"
                required
                defaultValue={original?.date ?? defaultDate()}
              />
            </label>
            <label>
              Amount paid (BRL)
              <input
                name="paid"
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={original && (original.paidCents / 100).toFixed(2)}
              />
            </label>
            <label>
              Room
              <input
                name="room"
                required
                list={formId + '-rooms'}
                defaultValue={original?.room}
              />
            </label>
            <label>
              Supplier
              <input
                name="supplier"
                required
                list={formId + '-suppliers'}
                defaultValue={original?.supplier}
              />
            </label>
            <datalist id={formId + '-rooms'}>
              {rooms.map((room) => (
                <option key={room} value={room} />
              ))}
            </datalist>
            <datalist id={formId + '-suppliers'}>
              {suppliers.map((supplier) => (
                <option key={supplier} value={supplier} />
              ))}
            </datalist>
            <details className="wide purchase-items">
              <summary>Receipt details</summary>
              <label>
                Discount (BRL)
                <input
                  name="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={((original?.discountCents ?? 0) / 100).toFixed(
                    2,
                  )}
                />
              </label>
              {lines.map(({ key, item }, index) => (
                <fieldset key={key}>
                  <legend>Line item {index + 1}</legend>
                  <label>
                    Item name
                    <input
                      required
                      name={'name-' + key}
                      defaultValue={item.name}
                    />
                  </label>
                  <label>
                    Quantity
                    <input
                      required
                      name={'qty-' + key}
                      type="number"
                      min="0.000001"
                      step="any"
                      defaultValue={item.quantity}
                    />
                  </label>
                  <label>
                    Unit price (BRL)
                    <input
                      required
                      name={'price-' + key}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={(item.unitPriceCents / 100).toFixed(2)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setLines(lines.filter((line) => line.key !== key))
                    }
                  >
                    Remove line item
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                onClick={() =>
                  setLines([
                    ...lines,
                    {
                      key: nextKey.current++,
                      item: { name: '', quantity: 1, unitPriceCents: 0 },
                    },
                  ])
                }
              >
                Add line item
              </button>
            </details>
          </fieldset>
        )}
        {error && <p role="alert">Change could not be saved. {error}</p>}
        <div className="purchase-actions">
          <button type="button" disabled={saving} onClick={close}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={action.kind === 'delete' ? 'danger' : 'primary'}
          >
            {saving
              ? 'Saving…'
              : action.kind === 'delete'
                ? 'Confirm deletion'
                : 'Save purchase'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
